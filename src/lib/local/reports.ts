// Local-SQLite port of lib/analytics/reports.ts — same snapshot shape/logic,
// fed by the local trade fetch + local mistake-pattern detector instead of
// Prisma.
import { queryAll, queryOne, run } from "@/lib/local/db";
import { genId, nowIso, LocalApiError } from "@/lib/local/utils";
import {
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
} from "@/lib/analytics/compute";
import { detectRepeatedMistakesLocal } from "@/lib/local/mistake-patterns";
import { getTradesInRangeLocal } from "@/lib/local/analytics";
import { previousWeekRange, previousMonthRange } from "@/lib/dates";
import { getOrCreateLocalPreference } from "@/lib/local/preferences";
import { createNotification } from "@/lib/local/notifications";
import type { ReportType } from "@/lib/constants";
import type { ReportDTO } from "@/hooks/use-reports";

export async function buildReportSnapshotLocal(opts: { type: ReportType; accountId?: string | null; periodStart: Date; periodEnd: Date }) {
  const trades = await getTradesInRangeLocal({ start: opts.periodStart, end: opts.periodEnd, filters: { accountId: opts.accountId } });

  const summary = computeSummaryStats(trades);
  const { best: bestTrade, worst: worstTrade } = computeBestWorstTrade(trades);
  const assetPerf = computePerformanceByAsset(trades).sort((a, b) => b.totalPnl - a.totalPnl);
  const { best: bestDay, worst: worstDay } = computeBestWorstDay(trades);
  const strategyPerformance = computeStrategyPerformance(trades);
  const sessionPerformance = computeSessionPerformance(trades);
  const mostCommonMistakes = computeMostCommonMistakes(trades);
  const repeatedMistakes = await detectRepeatedMistakesLocal({
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
    keyObservations.push(`Most common mistake: "${mostCommonMistakes[0].label}" (${mostCommonMistakes[0].occurrences} occurrences).`);
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

function mapReportRow(row: Record<string, unknown>): ReportDTO {
  return {
    id: row.id as string,
    type: row.type as ReportType,
    accountId: (row.accountId as string) ?? null,
    periodStart: row.periodStart as string,
    periodEnd: row.periodEnd as string,
    totalPnl: row.totalPnl as number,
    winRate: row.winRate as number,
    tradeCount: row.tradeCount as number,
    generatedAt: row.generatedAt as string,
  };
}

export async function listReportsLocal(): Promise<ReportDTO[]> {
  const rows = await queryAll("SELECT * FROM reports ORDER BY generatedAt DESC");
  return rows.map(mapReportRow);
}

export async function getReportLocal(id: string): Promise<ReportDTO & { data: unknown }> {
  const row = await queryOne<Record<string, unknown>>("SELECT * FROM reports WHERE id = ?", [id]);
  if (!row) throw new LocalApiError("Report not found.", 404);
  return { ...mapReportRow(row), data: JSON.parse(row.dataJson as string) };
}

export async function generateReportLocal(input: { type: ReportType; accountId?: string | null; periodStart: Date; periodEnd: Date }): Promise<ReportDTO> {
  const snapshot = await buildReportSnapshotLocal(input);
  const id = genId();
  await run(
    `INSERT INTO reports (id, type, accountId, periodStart, periodEnd, totalPnl, winRate, tradeCount, dataJson, generatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, snapshot.type, snapshot.accountId, snapshot.periodStart, snapshot.periodEnd, snapshot.summary.totalPnl, snapshot.summary.winRate ?? 0, snapshot.summary.totalTrades, JSON.stringify(snapshot), nowIso()]
  );
  const row = await queryOne<Record<string, unknown>>("SELECT * FROM reports WHERE id = ?", [id]);
  return mapReportRow(row!);
}

export async function deleteReportLocal(id: string): Promise<void> {
  await run("DELETE FROM reports WHERE id = ?", [id]);
}

// Local port of /api/reports/check-due — same "check on load" self-healing
// pattern substituting for a background job.
export async function checkReportsDueLocal(): Promise<string[]> {
  const prefs = await getOrCreateLocalPreference();
  const created: string[] = [];

  const weekRange = previousWeekRange();
  const existingWeekly = await queryOne("SELECT id FROM reports WHERE type = 'WEEKLY' AND accountId IS NULL AND periodStart = ?", [
    weekRange.start.toISOString(),
  ]);
  if (!existingWeekly) {
    const [{ count }] = await queryAll<{ count: number }>("SELECT COUNT(*) as count FROM trades WHERE entryDateTime >= ? AND entryDateTime <= ?", [
      weekRange.start.toISOString(),
      weekRange.end.toISOString(),
    ]);
    if (count > 0) {
      const report = await generateReportLocal({ type: "WEEKLY", accountId: null, periodStart: weekRange.start, periodEnd: weekRange.end });
      if (prefs.notifyWeeklyReport) {
        await createNotification(
          "WEEKLY_REPORT_READY",
          "Weekly report ready",
          `Your trading report for the week of ${weekRange.start.toLocaleDateString()} is ready to view.`,
          report.id
        );
      }
      created.push("WEEKLY");
    }
  }

  const monthRange = previousMonthRange();
  const existingMonthly = await queryOne("SELECT id FROM reports WHERE type = 'MONTHLY' AND accountId IS NULL AND periodStart = ?", [
    monthRange.start.toISOString(),
  ]);
  if (!existingMonthly) {
    const [{ count }] = await queryAll<{ count: number }>("SELECT COUNT(*) as count FROM trades WHERE entryDateTime >= ? AND entryDateTime <= ?", [
      monthRange.start.toISOString(),
      monthRange.end.toISOString(),
    ]);
    if (count > 0) {
      const report = await generateReportLocal({ type: "MONTHLY", accountId: null, periodStart: monthRange.start, periodEnd: monthRange.end });
      if (prefs.notifyMonthlyReport) {
        await createNotification(
          "MONTHLY_REPORT_READY",
          "Monthly report ready",
          `Your trading report for ${monthRange.start.toLocaleDateString("en-US", { month: "long", year: "numeric" })} is ready to view.`,
          report.id
        );
      }
      created.push("MONTHLY");
    }
  }

  return created;
}
