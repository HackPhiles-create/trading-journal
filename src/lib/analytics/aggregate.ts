import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateRR } from "@/lib/trading-math";
import { MIN_SAMPLE_SIZE } from "@/lib/constants";
import type { Direction } from "@/lib/constants";

// The single place summary stats, best/worst breakdowns, and behavioral
// analysis are computed — reused by dashboard cards, the analytics page, and
// weekly/monthly reports so figures can never diverge between views.

export type TradeWithRelations = Awaited<ReturnType<typeof getTradesInRange>>[number];

export interface TradeFilters {
  accountId?: string | null;
  assetId?: string | null;
  strategyId?: string | null;
  direction?: Direction | null;
  result?: string | null;
  session?: string | null;
  mistakeId?: string | null;
}

export async function getTradesInRange(opts: {
  start?: Date;
  end?: Date;
  filters?: TradeFilters;
}) {
  const { start, end, filters } = opts;

  return prisma.trade.findMany({
    where: {
      ...(start || end
        ? { entryDateTime: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } }
        : {}),
      ...(filters?.accountId ? { accountId: filters.accountId } : {}),
      ...(filters?.assetId ? { assetId: filters.assetId } : {}),
      ...(filters?.strategyId ? { strategyId: filters.strategyId } : {}),
      ...(filters?.direction ? { direction: filters.direction } : {}),
      ...(filters?.result ? { result: filters.result } : {}),
      ...(filters?.session ? { session: filters.session } : {}),
      ...(filters?.mistakeId ? { mistakes: { some: { mistakeId: filters.mistakeId } } } : {}),
    },
    include: {
      account: true,
      asset: true,
      strategy: true,
      mistakes: { include: { mistake: true } },
      checklistAnswers: { include: { checklistItem: true } },
      screenshots: true,
    },
    orderBy: { entryDateTime: "asc" },
  });
}

function tradeRR(trade: TradeWithRelations) {
  return calculateRR({
    direction: trade.direction as Direction,
    entry: trade.entryPrice,
    sl: trade.stopLoss,
    tp: trade.takeProfit,
    lotSize: trade.lotSize,
    contractSize: trade.asset?.contractSize ?? 1,
  });
}

export interface SummaryStats {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  totalPnl: number;
  winRate: number | null;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  avgRR: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  currentStreak: { type: "WIN" | "LOSS" | "NONE"; count: number };
}

export function computeSummaryStats(trades: TradeWithRelations[]): SummaryStats {
  const closed = trades.filter((t) => t.status === "CLOSED" && t.actualPnl != null);
  const wins = closed.filter((t) => t.result === "WIN");
  const losses = closed.filter((t) => t.result === "LOSS");
  const breakeven = closed.filter((t) => t.result === "BREAKEVEN");

  const totalPnl = closed.reduce((sum, t) => sum + (t.actualPnl ?? 0), 0);
  const grossProfit = wins.reduce((sum, t) => sum + Math.max(t.actualPnl ?? 0, 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Math.min(t.actualPnl ?? 0, 0), 0));

  const rrValues = trades.map(tradeRR).map((r) => r.rrRatio).filter((v): v is number => v != null);
  const avgRR = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : null;

  const winPnls = wins.map((t) => t.actualPnl ?? 0);
  const lossPnls = losses.map((t) => t.actualPnl ?? 0);

  // Streak: walk closed trades most-recent-first, count consecutive same result.
  const chronoDesc = [...closed].sort(
    (a, b) => new Date(b.entryDateTime).getTime() - new Date(a.entryDateTime).getTime()
  );
  let streakType: "WIN" | "LOSS" | "NONE" = "NONE";
  let streakCount = 0;
  for (const t of chronoDesc) {
    if (t.result !== "WIN" && t.result !== "LOSS") break;
    if (streakType === "NONE") {
      streakType = t.result;
      streakCount = 1;
    } else if (t.result === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    openTrades: trades.length - closed.length,
    totalPnl,
    winRate: closed.length ? (wins.length / closed.length) * 100 : null,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakevenTrades: breakeven.length,
    avgRR,
    avgWin: winPnls.length ? winPnls.reduce((a, b) => a + b, 0) / winPnls.length : null,
    avgLoss: lossPnls.length ? lossPnls.reduce((a, b) => a + b, 0) / lossPnls.length : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : null,
    largestWin: winPnls.length ? Math.max(...winPnls) : null,
    largestLoss: lossPnls.length ? Math.min(...lossPnls) : null,
    currentStreak: { type: streakType, count: streakCount },
  };
}

export function computeEquitySeries(trades: TradeWithRelations[]) {
  const closed = trades
    .filter((t) => t.status === "CLOSED" && t.actualPnl != null && t.exitDateTime)
    .sort((a, b) => new Date(a.exitDateTime!).getTime() - new Date(b.exitDateTime!).getTime());

  let running = 0;
  let peak = 0;
  return closed.map((t) => {
    running += t.actualPnl ?? 0;
    peak = Math.max(peak, running);
    return {
      date: t.exitDateTime as Date,
      pnl: t.actualPnl ?? 0,
      equity: running,
      drawdown: running - peak,
      tradeId: t.id,
    };
  });
}

export function computeMaxDrawdown(equitySeries: ReturnType<typeof computeEquitySeries>): number {
  if (!equitySeries.length) return 0;
  return Math.min(...equitySeries.map((p) => p.drawdown));
}

export function computeBestWorstTrade(trades: TradeWithRelations[]) {
  const closed = trades.filter((t) => t.status === "CLOSED" && t.actualPnl != null);
  if (!closed.length) return { best: null, worst: null };
  const best = closed.reduce((a, b) => ((a.actualPnl ?? 0) >= (b.actualPnl ?? 0) ? a : b));
  const worst = closed.reduce((a, b) => ((a.actualPnl ?? 0) <= (b.actualPnl ?? 0) ? a : b));
  return { best, worst };
}

export interface AssetPerformance {
  assetId: string;
  symbol: string;
  trades: number;
  winRate: number | null;
  totalPnl: number;
  avgRR: number | null;
}

export function computePerformanceByAsset(trades: TradeWithRelations[]): AssetPerformance[] {
  return groupAndSummarize(trades, (t) => t.assetId, (t) => t.asset.symbol);
}

export interface StrategyPerformance {
  strategyId: string;
  name: string;
  trades: number;
  winRate: number | null;
  totalPnl: number;
  avgRR: number | null;
}

export function computeStrategyPerformance(trades: TradeWithRelations[]): StrategyPerformance[] {
  return groupAndSummarize(
    trades.filter((t) => t.strategyId),
    (t) => t.strategyId as string,
    (t) => t.strategy?.name ?? "Unknown"
  ).map((r) => ({ strategyId: r.assetId, name: r.symbol, trades: r.trades, winRate: r.winRate, totalPnl: r.totalPnl, avgRR: r.avgRR }));
}

export interface SessionPerformance {
  session: string;
  trades: number;
  winRate: number | null;
  totalPnl: number;
}

export function computeSessionPerformance(trades: TradeWithRelations[]): SessionPerformance[] {
  const bySession = new Map<string, TradeWithRelations[]>();
  for (const t of trades.filter((t) => t.session)) {
    const key = t.session as string;
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key)!.push(t);
  }
  return Array.from(bySession.entries()).map(([session, group]) => {
    const closed = group.filter((t) => t.status === "CLOSED" && t.actualPnl != null);
    const wins = closed.filter((t) => t.result === "WIN");
    return {
      session,
      trades: group.length,
      winRate: closed.length ? (wins.length / closed.length) * 100 : null,
      totalPnl: closed.reduce((sum, t) => sum + (t.actualPnl ?? 0), 0),
    };
  });
}

function groupAndSummarize(
  trades: TradeWithRelations[],
  keyFn: (t: TradeWithRelations) => string,
  labelFn: (t: TradeWithRelations) => string
): AssetPerformance[] {
  const groups = new Map<string, TradeWithRelations[]>();
  for (const t of trades) {
    const key = keyFn(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return Array.from(groups.entries()).map(([key, group]) => {
    const closed = group.filter((t) => t.status === "CLOSED" && t.actualPnl != null);
    const wins = closed.filter((t) => t.result === "WIN");
    const rrValues = group.map(tradeRR).map((r) => r.rrRatio).filter((v): v is number => v != null);
    return {
      assetId: key,
      symbol: labelFn(group[0]),
      trades: group.length,
      winRate: closed.length ? (wins.length / closed.length) * 100 : null,
      totalPnl: closed.reduce((sum, t) => sum + (t.actualPnl ?? 0), 0),
      avgRR: rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : null,
    };
  });
}

export interface MistakeFrequency {
  mistakeId: string;
  label: string;
  occurrences: number;
  lossCount: number;
  winRateWithMistake: number | null;
  pnlImpact: number;
}

export function computeMostCommonMistakes(trades: TradeWithRelations[]): MistakeFrequency[] {
  const byMistake = new Map<string, { label: string; trades: TradeWithRelations[] }>();
  for (const t of trades) {
    for (const tm of t.mistakes) {
      const key = tm.mistakeId;
      if (!byMistake.has(key)) byMistake.set(key, { label: tm.mistake.label, trades: [] });
      byMistake.get(key)!.trades.push(t);
    }
  }
  return Array.from(byMistake.entries())
    .map(([mistakeId, { label, trades: group }]) => {
      const closed = group.filter((t) => t.status === "CLOSED" && t.actualPnl != null);
      const losses = closed.filter((t) => t.result === "LOSS");
      const wins = closed.filter((t) => t.result === "WIN");
      return {
        mistakeId,
        label,
        occurrences: group.length,
        lossCount: losses.length,
        winRateWithMistake: closed.length ? (wins.length / closed.length) * 100 : null,
        pnlImpact: closed.reduce((sum, t) => sum + (t.actualPnl ?? 0), 0),
      };
    })
    .sort((a, b) => b.occurrences - a.occurrences);
}

export function computeBestWorstDay(trades: TradeWithRelations[]) {
  const byDay = new Map<string, number>();
  for (const t of trades) {
    if (t.status !== "CLOSED" || t.actualPnl == null || !t.exitDateTime) continue;
    const key = new Date(t.exitDateTime).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + t.actualPnl);
  }
  const entries = Array.from(byDay.entries());
  if (!entries.length) return { best: null, worst: null };
  const best = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
  const worst = entries.reduce((a, b) => (a[1] <= b[1] ? a : b));
  return { best: { date: best[0], pnl: best[1] }, worst: { date: worst[0], pnl: worst[1] } };
}

export function computeDayOfWeekPerformance(trades: TradeWithRelations[]) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets = labels.map((label) => ({ label, trades: 0, pnl: 0, wins: 0, closed: 0 }));
  for (const t of trades) {
    const day = new Date(t.entryDateTime).getDay();
    buckets[day].trades++;
    if (t.status === "CLOSED" && t.actualPnl != null) {
      buckets[day].pnl += t.actualPnl;
      buckets[day].closed++;
      if (t.result === "WIN") buckets[day].wins++;
    }
  }
  return buckets.map((b) => ({
    label: b.label,
    trades: b.trades,
    pnl: b.pnl,
    winRate: b.closed ? (b.wins / b.closed) * 100 : null,
  }));
}

export function computeHourOfDayPerformance(trades: TradeWithRelations[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, trades: 0, pnl: 0, wins: 0, closed: 0 }));
  for (const t of trades) {
    const hour = new Date(t.entryDateTime).getHours();
    buckets[hour].trades++;
    if (t.status === "CLOSED" && t.actualPnl != null) {
      buckets[hour].pnl += t.actualPnl;
      buckets[hour].closed++;
      if (t.result === "WIN") buckets[hour].wins++;
    }
  }
  return buckets.map((b) => ({
    hour: b.hour,
    trades: b.trades,
    pnl: b.pnl,
    winRate: b.closed ? (b.wins / b.closed) * 100 : null,
  }));
}

export interface BehavioralAnalysis {
  hasEnoughData: boolean;
  sampleSize: number;
  bestSetup: StrategyPerformance | null;
  worstSetup: StrategyPerformance | null;
  bestAsset: AssetPerformance | null;
  worstAsset: AssetPerformance | null;
  bestSession: SessionPerformance | null;
  worstSession: SessionPerformance | null;
  mostCommonMistake: MistakeFrequency | null;
  repeatedMistakes: MistakeFrequency[];
  overtradingDaysCount: number; // days with more than 5 trades, a simple heuristic
}

const OVERTRADING_DAILY_THRESHOLD = 5;

export function computeBehavioralAnalysis(trades: TradeWithRelations[]): BehavioralAnalysis {
  const sampleSize = trades.length;
  const hasEnoughData = sampleSize >= MIN_SAMPLE_SIZE;

  if (!hasEnoughData) {
    return {
      hasEnoughData: false,
      sampleSize,
      bestSetup: null,
      worstSetup: null,
      bestAsset: null,
      worstAsset: null,
      bestSession: null,
      worstSession: null,
      mostCommonMistake: null,
      repeatedMistakes: [],
      overtradingDaysCount: 0,
    };
  }

  const strategies = computeStrategyPerformance(trades).filter((s) => s.trades >= 3);
  const assets = computePerformanceByAsset(trades).filter((a) => a.trades >= 3);
  const sessions = computeSessionPerformance(trades).filter((s) => s.trades >= 3);
  const mistakes = computeMostCommonMistakes(trades);

  const byWinRate = <T extends { winRate: number | null }>(arr: T[]) =>
    arr.filter((x) => x.winRate != null);

  const bestSetup = byWinRate(strategies).sort((a, b) => (b.winRate! - a.winRate!))[0] ?? null;
  const worstSetup = byWinRate(strategies).sort((a, b) => (a.winRate! - b.winRate!))[0] ?? null;
  const bestAsset = byWinRate(assets).sort((a, b) => (b.winRate! - a.winRate!))[0] ?? null;
  const worstAsset = byWinRate(assets).sort((a, b) => (a.winRate! - b.winRate!))[0] ?? null;
  const bestSession = byWinRate(sessions).sort((a, b) => (b.winRate! - a.winRate!))[0] ?? null;
  const worstSession = byWinRate(sessions).sort((a, b) => (a.winRate! - b.winRate!))[0] ?? null;

  const byDay = new Map<string, number>();
  for (const t of trades) {
    const key = new Date(t.entryDateTime).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const overtradingDaysCount = Array.from(byDay.values()).filter((c) => c > OVERTRADING_DAILY_THRESHOLD).length;

  return {
    hasEnoughData: true,
    sampleSize,
    bestSetup,
    worstSetup,
    bestAsset,
    worstAsset,
    bestSession,
    worstSession,
    mostCommonMistake: mistakes[0] ?? null,
    repeatedMistakes: mistakes.filter((m) => m.occurrences >= 3),
    overtradingDaysCount,
  };
}
