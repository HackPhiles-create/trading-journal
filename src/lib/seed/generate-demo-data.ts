// No "server-only" marker here: this module is imported both by Next.js API
// routes and by prisma/seed.ts, which runs standalone via `tsx` (plain
// Node module resolution) rather than through the Next.js bundler, so the
// "server-only" package would throw immediately on import in that context.
import { faker } from "@faker-js/faker";
import { prisma } from "@/lib/prisma";
import { calculateRR } from "@/lib/trading-math";
import type { Direction } from "@/lib/constants";

faker.seed(20260101);

const DEMO_ACCOUNTS = [
  { name: "Demo Account", type: "DEMO", currency: "USD", startingBalance: 10000 },
  { name: "Prop Firm Challenge", type: "PROP_FIRM", currency: "USD", startingBalance: 50000 },
];

// Realistic-ish base price + point size per symbol so generated entries look
// like real quotes rather than arbitrary numbers.
const ASSET_PROFILES: Record<
  string,
  { base: number; volatility: number; pointSize: number; lotRange: [number, number]; decimals: number }
> = {
  XAUUSD: { base: 2000, volatility: 30, pointSize: 1, lotRange: [0.05, 0.5], decimals: 2 },
  EURUSD: { base: 1.08, volatility: 0.02, pointSize: 0.0001, lotRange: [0.1, 1], decimals: 5 },
  GBPUSD: { base: 1.27, volatility: 0.02, pointSize: 0.0001, lotRange: [0.1, 1], decimals: 5 },
  USDJPY: { base: 150, volatility: 3, pointSize: 0.01, lotRange: [0.1, 1], decimals: 3 },
  BTCUSD: { base: 55000, volatility: 8000, pointSize: 50, lotRange: [0.02, 0.3], decimals: 2 },
  ETHUSD: { base: 2800, volatility: 500, pointSize: 15, lotRange: [0.1, 1.5], decimals: 2 },
  NAS100: { base: 17000, volatility: 800, pointSize: 1, lotRange: [0.1, 1], decimals: 2 },
  US30: { base: 36000, volatility: 1000, pointSize: 3, lotRange: [0.1, 1], decimals: 2 },
};

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Mistakes we deliberately cluster within the last 30 days so the repeated-
// mistake detector has something real to surface immediately after seeding.
const CLUSTERED_MISTAKES = ["FOMO", "Moved SL", "Entered too early"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateDemoTrades(opts: { tradesPerAccount?: number } = {}) {
  const tradesPerAccount = opts.tradesPerAccount ?? 130;

  const accounts = await Promise.all(
    DEMO_ACCOUNTS.map((a) =>
      prisma.account.upsert({
        where: { id: `demo-${a.name.toLowerCase().replace(/\s+/g, "-")}` },
        update: {},
        create: { id: `demo-${a.name.toLowerCase().replace(/\s+/g, "-")}`, ...a, isDemo: true },
      })
    )
  );

  const [assets, strategies, checklistItems, mistakes] = await Promise.all([
    prisma.asset.findMany({ where: { symbol: { in: Object.keys(ASSET_PROFILES) } } }),
    prisma.strategy.findMany(),
    prisma.checklistItem.findMany(),
    prisma.mistake.findMany(),
  ]);

  const clusteredMistakes = mistakes.filter((m) => CLUSTERED_MISTAKES.includes(m.label));
  const otherMistakes = mistakes.filter((m) => !CLUSTERED_MISTAKES.includes(m.label));

  const now = Date.now();
  const fiveMonthsAgo = now - 150 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const account of accounts) {
    for (let i = 0; i < tradesPerAccount; i++) {
      const asset = pick(assets);
      const profile = ASSET_PROFILES[asset.symbol];
      const strategy = pick(strategies);
      const direction: Direction = Math.random() > 0.5 ? "BUY" : "SELL";

      // The first few trades per account are forced open-and-recent so the
      // "OPEN" status path always has real data to show, regardless of the
      // random draws below.
      const forceOpen = i < 3;

      // Bias entry time toward the recent window so the last-30-days mistake
      // detector has enough density (roughly a third of trades land there).
      const isRecent = forceOpen || Math.random() < 0.4;
      const entryTimestamp = forceOpen
        ? randomBetween(now - 2 * 24 * 60 * 60 * 1000, now - 2 * 60 * 60 * 1000)
        : isRecent
          ? randomBetween(thirtyDaysAgo, now - 2 * 60 * 60 * 1000)
          : randomBetween(fiveMonthsAgo, thirtyDaysAgo);
      const entryDateTime = new Date(entryTimestamp);

      const entryPrice = round(profile.base + randomBetween(-profile.volatility, profile.volatility), profile.decimals);
      const riskDistance = randomBetween(profile.pointSize * 5, profile.pointSize * 40);
      const targetRR = randomBetween(1.2, 3.2);
      const rewardDistance = riskDistance * targetRR;

      const stopLoss = round(direction === "BUY" ? entryPrice - riskDistance : entryPrice + riskDistance, profile.decimals);
      const takeProfit = round(direction === "BUY" ? entryPrice + rewardDistance : entryPrice - rewardDistance, profile.decimals);
      const lotSize = Number(randomBetween(profile.lotRange[0], profile.lotRange[1]).toFixed(2));

      const rr = calculateRR({ direction, entry: entryPrice, sl: stopLoss, tp: takeProfit, lotSize, contractSize: asset.contractSize });

      const isOpen = forceOpen;

      // Attach mistakes first — the win/loss roll below is biased by them, so
      // the seeded data honestly shows worse outcomes for flagged trades
      // rather than just tagging mistakes onto random results.
      const tradeMistakes: { mistakeId: string; note: string | null }[] = [];
      if (isRecent && Math.random() < 0.35 && clusteredMistakes.length) {
        tradeMistakes.push({ mistakeId: pick(clusteredMistakes).id, note: null });
      } else if (Math.random() < 0.15 && otherMistakes.length) {
        tradeMistakes.push({ mistakeId: pick(otherMistakes).id, note: null });
      }
      if (Math.random() < 0.08 && otherMistakes.length) {
        tradeMistakes.push({ mistakeId: pick(otherMistakes).id, note: null });
      }

      const checklistCount = faker.number.int({ min: 1, max: 4 });
      const shuffledChecklist = faker.helpers.shuffle(checklistItems).slice(0, checklistCount);

      if (isOpen) {
        await prisma.trade.create({
          data: {
            accountId: account.id,
            assetId: asset.id,
            strategyId: strategy.id,
            direction,
            status: "OPEN",
            session: pick(["ASIA", "LONDON", "NEWYORK", "OVERLAP"]),
            entryDateTime,
            entryPrice,
            stopLoss,
            takeProfit,
            lotSize,
            reasoningText: faker.lorem.sentence(),
            isDemo: true,
            checklistAnswers: { create: shuffledChecklist.map((c) => ({ checklistItemId: c.id, checked: true })) },
            mistakes: { create: tradeMistakes },
          },
        });
        continue;
      }

      // Win probability drops noticeably when a mistake is attached — this
      // is what lets the repeated-mistake detector show a real win-rate delta.
      const baseWinChance = 0.54;
      const winChance = tradeMistakes.length > 0 ? baseWinChance - 0.22 : baseWinChance;
      const roll = Math.random();
      const result = roll < 0.04 ? "BREAKEVEN" : roll < 0.04 + winChance ? "WIN" : "LOSS";

      let exitPrice: number;
      let actualPnl: number;
      let actualRMultiple: number;

      if (result === "WIN") {
        const achievedRR = targetRR * randomBetween(0.75, 1.05);
        exitPrice = round(direction === "BUY" ? entryPrice + riskDistance * achievedRR : entryPrice - riskDistance * achievedRR, profile.decimals);
        actualRMultiple = achievedRR;
        actualPnl = Math.abs(rr.potentialProfit) * randomBetween(0.75, 1.05);
      } else if (result === "LOSS") {
        const achievedRR = randomBetween(0.7, 1.05);
        exitPrice = round(direction === "BUY" ? entryPrice - riskDistance * achievedRR : entryPrice + riskDistance * achievedRR, profile.decimals);
        actualRMultiple = -achievedRR;
        actualPnl = -Math.abs(rr.potentialLoss) * randomBetween(0.7, 1.05);
      } else {
        exitPrice = round(entryPrice + randomBetween(-profile.pointSize, profile.pointSize), profile.decimals);
        actualRMultiple = 0;
        actualPnl = randomBetween(-5, 5);
      }

      const exitDateTime = new Date(entryTimestamp + randomBetween(30, 8 * 60) * 60 * 1000);

      await prisma.trade.create({
        data: {
          accountId: account.id,
          assetId: asset.id,
          strategyId: strategy.id,
          direction,
          status: "CLOSED",
          session: pick(["ASIA", "LONDON", "NEWYORK", "OVERLAP"]),
          entryDateTime,
          entryPrice,
          stopLoss,
          takeProfit,
          lotSize,
          exitPrice,
          exitDateTime,
          result,
          actualPnl: round(actualPnl, 2),
          actualRMultiple: round(actualRMultiple, 2),
          reasoningText: faker.lorem.sentence(),
          emotionalState: pick(["CALM", "CONFIDENT", "FOMO", "NEUTRAL", "REVENGE", "GREED"]),
          whatWentWell: result === "WIN" ? faker.lorem.sentence() : null,
          whatToImprove: result === "LOSS" ? faker.lorem.sentence() : null,
          isDemo: true,
          checklistAnswers: { create: shuffledChecklist.map((c) => ({ checklistItemId: c.id, checked: true })) },
          mistakes: { create: tradeMistakes },
        },
      });
    }
  }

  return { accounts: accounts.length, tradesPerAccount };
}

export async function clearDemoData() {
  await prisma.trade.deleteMany({ where: { isDemo: true } });
  await prisma.account.deleteMany({ where: { isDemo: true } });
}
