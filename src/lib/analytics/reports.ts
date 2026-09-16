import "server-only";
import { prisma } from "@/lib/prisma";
import {
  getTradesInRange,
  computeSummaryStats,
  computeBestWorstTrade,
  computePerformanceByAsset,
  computeStrategyPerformance,
  computeSessionPerformance,
  computeMostCommonMistakes,
  computeBestWorstDay,
  computeMaxDrawdown,
  computeEquitySeries,
  computeBehavioralAnalysis,
} from "@/lib/analytics/aggregate";
import { detectRepeatedMistakes } from "@/lib/analytics/mistake-patterns";
import type { ReportType } from "@/lib/constants";

export interface ReportSnapshot {
  type: ReportType;
  accountId: string | null;
  periodStart: string;
  periodEnd: string;
  summary: ReturnType<typeof computeSummaryStats>;
  bestTrade: unknown;
  worstTrade: unknown;
  bestAsset: unknown;
  worstAsset: unknown;
  bestDay: unknown;
  worstDay: unknown;
  strategyPerformance: ReturnType<typeof computeStrategyPerformance>;
  sessionPerformance: ReturnType<typeof computeSessionPerformance>;
  mostCommonMistakes: ReturnType<typeof computeMostCommonMistakes>;
  repeatedMistakes: Awaited<ReturnType<typeof detectRepeatedMistakes>>;
  maxDrawdown: number | null; // monthly only
  behavioral: ReturnType<typeof computeBehavioralAnalysis> | null; // monthly only
  keyObservations: string[];
}

async function buildReport(opts: {
  type: ReportType;
  accountId?: string | null;
  periodStart: Date;
  periodEnd: Date;
}): Promise<ReportSnapshot> {
  const trades = await getTradesInRange({
    start: opts.periodStart,
    end: opts.periodEnd,
    filters: { accountId: opts.accountId },
  });

  const summary = computeSummaryStats(trades);
  const { best: bestTrade, worst: worstTrade } = computeBestWorstTrade(trades);
  const assetPerf = computePerformanceByAsset(trades).sort((a, b) => b.totalPnl - a.totalPnl);
  const { best: bestDay, worst: worstDay } = computeBestWorstDay(trades);
  const strategyPerformance = computeStrategyPerformance(trades);
  const sessionPerformance = computeSessionPerformance(trades);
  const mostCommonMistakes = computeMostCommonMistakes(trades);
  const repeatedMistakes = await detectRepeatedMistakes({
    accountId: opts.accountId,
    windowDays: Math.max(1, Math.ceil((opts.periodEnd.getTime() - opts.periodStart.getTime()) / 86_400_000)),
  });

  const isMonthly = opts.type === "MONTHLY";
  const maxDrawdown = isMonthly ? computeMaxDrawdown(computeEquitySeries(trades)) : null;
  const behavioral = isMonthly ? computeBehavioralAnalysis(trades) : null;

  const keyObservations: string[] = [];
  if (summary.winRate != null) {
    keyObservations.push(`Win rate was ${summary.winRate.toFixed(1)}% across ${summary.closedTrades} closed trades.`);
  }
  if (behavioral?.hasEnoughData && behavioral.bestSetup) {
    keyObservations.push(
      `Highest-performing setup: ${behavioral.bestSetup.name} at ${behavioral.bestSetup.winRate?.toFixed(0)}% win rate across ${behavioral.bestSetup.trades} trades.`
    );
  }
  if (mostCommonMistakes[0]) {
    keyObservations.push(
      `Most common mistake: "${mostCommonMistakes[0].label}" (${mostCommonMistakes[0].occurrences} occurrences).`
    );
  }

  return {
    type: opts.type,
    accountId: opts.accountId ?? null,
    periodStart: opts.periodStart.toISOString(),
    periodEnd: opts.periodEnd.toISOString(),
    summary,
    bestTrade,
    worstTrade,
    bestAsset: assetPerf[0] ?? null,
    worstAsset: assetPerf[assetPerf.length - 1] ?? null,
    bestDay,
    worstDay,
    strategyPerformance,
    sessionPerformance,
    mostCommonMistakes,
    repeatedMistakes,
    maxDrawdown,
    behavioral,
    keyObservations,
  };
}

export async function buildWeeklyReport(opts: { accountId?: string | null; periodStart: Date; periodEnd: Date }) {
  return buildReport({ ...opts, type: "WEEKLY" });
}

export async function buildMonthlyReport(opts: { accountId?: string | null; periodStart: Date; periodEnd: Date }) {
  return buildReport({ ...opts, type: "MONTHLY" });
}

export async function persistReport(snapshot: ReportSnapshot) {
  return prisma.report.create({
    data: {
      type: snapshot.type,
      accountId: snapshot.accountId,
      periodStart: new Date(snapshot.periodStart),
      periodEnd: new Date(snapshot.periodEnd),
      totalPnl: snapshot.summary.totalPnl,
      winRate: snapshot.summary.winRate ?? 0,
      tradeCount: snapshot.summary.totalTrades,
      dataJson: JSON.stringify(snapshot),
    },
  });
}
