import "server-only";
import { prisma } from "@/lib/prisma";
import {
  MISTAKE_PATTERN_WINDOW_DAYS,
  MISTAKE_PATTERN_MIN_OCCURRENCES,
  SETUP_LOSS_STREAK_MIN,
} from "@/lib/constants";

// Insights here are strictly derived from recorded journal data — occurrence
// counts, loss counts, and win-rate deltas computed from the database. No
// interpretive or unsupported claims are added beyond these numbers.

export interface RepeatedMistakeInsight {
  mistakeId: string;
  label: string;
  occurrences: number;
  lossCount: number;
  winRateWithMistake: number; // 0-100
  winRateBaseline: number | null; // 0-100, win rate of trades NOT tagged with this mistake, same window
  deltaWinRate: number | null; // winRateWithMistake - winRateBaseline
  pnlImpact: number;
  windowDays: number;
}

export async function detectRepeatedMistakes(opts: {
  accountId?: string | null;
  windowDays?: number;
  minOccurrences?: number;
}): Promise<RepeatedMistakeInsight[]> {
  const windowDays = opts.windowDays ?? MISTAKE_PATTERN_WINDOW_DAYS;
  const minOccurrences = opts.minOccurrences ?? MISTAKE_PATTERN_MIN_OCCURRENCES;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const trades = await prisma.trade.findMany({
    where: {
      entryDateTime: { gte: since },
      status: "CLOSED",
      ...(opts.accountId ? { accountId: opts.accountId } : {}),
    },
    include: { mistakes: { include: { mistake: true } } },
  });

  const byMistake = new Map<string, { label: string; trades: typeof trades }>();
  for (const t of trades) {
    for (const tm of t.mistakes) {
      if (!byMistake.has(tm.mistakeId)) byMistake.set(tm.mistakeId, { label: tm.mistake.label, trades: [] });
      byMistake.get(tm.mistakeId)!.trades.push(t);
    }
  }

  const insights: RepeatedMistakeInsight[] = [];
  for (const [mistakeId, { label, trades: flagged }] of byMistake) {
    if (flagged.length < minOccurrences) continue;

    const flaggedIds = new Set(flagged.map((t) => t.id));
    const rest = trades.filter((t) => !flaggedIds.has(t.id));

    const flaggedWithResult = flagged.filter((t) => t.actualPnl != null);
    const flaggedWins = flaggedWithResult.filter((t) => t.result === "WIN");
    const restWithResult = rest.filter((t) => t.actualPnl != null);
    const restWins = restWithResult.filter((t) => t.result === "WIN");

    const winRateWithMistake = flaggedWithResult.length ? (flaggedWins.length / flaggedWithResult.length) * 100 : 0;
    const winRateBaseline = restWithResult.length ? (restWins.length / restWithResult.length) * 100 : null;

    insights.push({
      mistakeId,
      label,
      occurrences: flagged.length,
      lossCount: flagged.filter((t) => t.result === "LOSS").length,
      winRateWithMistake,
      winRateBaseline,
      deltaWinRate: winRateBaseline != null ? winRateWithMistake - winRateBaseline : null,
      pnlImpact: flaggedWithResult.reduce((sum, t) => sum + (t.actualPnl ?? 0), 0),
      windowDays,
    });
  }

  return insights.sort((a, b) => {
    const aScore = a.deltaWinRate != null ? Math.abs(a.deltaWinRate) : 0;
    const bScore = b.deltaWinRate != null ? Math.abs(b.deltaWinRate) : 0;
    return bScore - aScore;
  });
}

export interface SetupLossStreakInsight {
  strategyId: string;
  strategyName: string;
  consecutiveLosses: number;
  tradeIds: string[];
}

export async function detectSetupLossStreaks(opts: {
  accountId?: string | null;
  minConsecutiveLosses?: number;
}): Promise<SetupLossStreakInsight[]> {
  const minConsecutiveLosses = opts.minConsecutiveLosses ?? SETUP_LOSS_STREAK_MIN;

  const trades = await prisma.trade.findMany({
    where: {
      status: "CLOSED",
      strategyId: { not: null },
      ...(opts.accountId ? { accountId: opts.accountId } : {}),
    },
    include: { strategy: true },
    orderBy: { entryDateTime: "desc" },
  });

  const byStrategy = new Map<string, typeof trades>();
  for (const t of trades) {
    const key = t.strategyId as string;
    if (!byStrategy.has(key)) byStrategy.set(key, []);
    byStrategy.get(key)!.push(t);
  }

  const insights: SetupLossStreakInsight[] = [];
  for (const [strategyId, group] of byStrategy) {
    let count = 0;
    const streakIds: string[] = [];
    for (const t of group) {
      if (t.result === "LOSS") {
        count++;
        streakIds.push(t.id);
      } else {
        break;
      }
    }
    if (count >= minConsecutiveLosses) {
      insights.push({
        strategyId,
        strategyName: group[0].strategy?.name ?? "Unknown",
        consecutiveLosses: count,
        tradeIds: streakIds,
      });
    }
  }

  return insights.sort((a, b) => b.consecutiveLosses - a.consecutiveLosses);
}
