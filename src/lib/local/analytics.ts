// Local-SQLite fetch feeding the same pure compute functions the server
// uses (lib/analytics/compute.ts) — see that file's header comment.
import {
  computeSummaryStats,
  computeEquitySeries,
  computePerformanceByAsset,
  computeStrategyPerformance,
  computeSessionPerformance,
  computeDayOfWeekPerformance,
  computeHourOfDayPerformance,
  computeMostCommonMistakes,
  type AnalyticsTrade,
} from "@/lib/analytics/compute";
import { detectRepeatedMistakesLocal, detectSetupLossStreaksLocal } from "@/lib/local/mistake-patterns";
import { getOrCreateLocalPreference } from "@/lib/local/preferences";
import { queryAll } from "@/lib/local/db";
import type { AnalyticsSummaryDTO, MistakePatternDTO } from "@/hooks/use-analytics";
import type { TradeFilterQuery } from "@/hooks/use-trades";

interface TradeFilters {
  accountId?: string | null;
  assetId?: string | null;
  strategyId?: string | null;
  direction?: string | null;
  result?: string | null;
  session?: string | null;
  mistakeId?: string | null;
}

export async function getTradesInRangeLocal(opts: { start?: Date; end?: Date; filters?: TradeFilters }): Promise<AnalyticsTrade[]> {
  const { start, end, filters } = opts;
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (start) { clauses.push("entryDateTime >= ?"); values.push(start.toISOString()); }
  if (end) { clauses.push("entryDateTime <= ?"); values.push(end.toISOString()); }
  if (filters?.accountId) { clauses.push("accountId = ?"); values.push(filters.accountId); }
  if (filters?.assetId) { clauses.push("assetId = ?"); values.push(filters.assetId); }
  if (filters?.strategyId) { clauses.push("strategyId = ?"); values.push(filters.strategyId); }
  if (filters?.direction) { clauses.push("direction = ?"); values.push(filters.direction); }
  if (filters?.result) { clauses.push("result = ?"); values.push(filters.result); }
  if (filters?.session) { clauses.push("session = ?"); values.push(filters.session); }
  if (filters?.mistakeId) { clauses.push("id IN (SELECT tradeId FROM trade_mistakes WHERE mistakeId = ?)"); values.push(filters.mistakeId); }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await queryAll<Record<string, unknown>>(`SELECT * FROM trades ${where} ORDER BY entryDateTime ASC`, values);
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id as string);
  const placeholders = ids.map(() => "?").join(",");

  const [assets, strategies, mistakeRows] = await Promise.all([
    queryAll<{ id: string; symbol: string; contractSize: number }>("SELECT id, symbol, contractSize FROM assets"),
    queryAll<{ id: string; name: string }>("SELECT id, name FROM strategies"),
    queryAll<{ tradeId: string; mistakeId: string; label: string }>(
      `SELECT tm.tradeId, tm.mistakeId, m.label FROM trade_mistakes tm JOIN mistakes m ON m.id = tm.mistakeId WHERE tm.tradeId IN (${placeholders})`,
      ids
    ),
  ]);
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const strategyMap = new Map(strategies.map((s) => [s.id, s]));
  const mistakesByTrade = new Map<string, { mistakeId: string; mistake: { label: string } }[]>();
  for (const r of mistakeRows) {
    const list = mistakesByTrade.get(r.tradeId) ?? [];
    list.push({ mistakeId: r.mistakeId, mistake: { label: r.label } });
    mistakesByTrade.set(r.tradeId, list);
  }

  return rows.map((row): AnalyticsTrade => {
    const asset = assetMap.get(row.assetId as string);
    const strategy = row.strategyId ? strategyMap.get(row.strategyId as string) : undefined;
    return {
      id: row.id as string,
      status: row.status as string,
      result: (row.result as string) ?? null,
      actualPnl: (row.actualPnl as number) ?? null,
      entryDateTime: row.entryDateTime as string,
      exitDateTime: (row.exitDateTime as string) ?? null,
      direction: row.direction as string,
      entryPrice: row.entryPrice as number,
      stopLoss: row.stopLoss as number,
      takeProfit: row.takeProfit as number,
      lotSize: row.lotSize as number,
      assetId: row.assetId as string,
      asset: asset ? { symbol: asset.symbol, contractSize: asset.contractSize } : { symbol: "?", contractSize: 1 },
      strategyId: (row.strategyId as string) ?? null,
      strategy: strategy ? { name: strategy.name } : null,
      session: (row.session as string) ?? null,
      mistakes: mistakesByTrade.get(row.id as string) ?? [],
    };
  });
}

export async function getAnalyticsSummaryLocal(opts: { start?: Date; end?: Date; filters?: TradeFilterQuery }): Promise<AnalyticsSummaryDTO> {
  const trades = await getTradesInRangeLocal({ start: opts.start, end: opts.end, filters: opts.filters });
  return {
    summary: computeSummaryStats(trades),
    equitySeries: computeEquitySeries(trades).map((e) => ({ ...e, date: String(e.date) })),
    performanceByAsset: computePerformanceByAsset(trades),
    strategyPerformance: computeStrategyPerformance(trades),
    sessionPerformance: computeSessionPerformance(trades),
    dayOfWeek: computeDayOfWeekPerformance(trades),
    hourOfDay: computeHourOfDayPerformance(trades),
    mistakeFrequency: computeMostCommonMistakes(trades),
  };
}

export async function getMistakePatternsLocal(accountId?: string): Promise<MistakePatternDTO> {
  const prefs = await getOrCreateLocalPreference();
  if (!prefs.autoDetectMistakes) {
    return { repeatedMistakes: [], setupLossStreaks: [], autoDetectDisabled: true };
  }
  const [repeatedMistakes, setupLossStreaks] = await Promise.all([
    detectRepeatedMistakesLocal({ accountId, windowDays: prefs.mistakeWindowDays, minOccurrences: prefs.mistakeMinOccurrences }),
    detectSetupLossStreaksLocal({ accountId }),
  ]);
  return { repeatedMistakes, setupLossStreaks, autoDetectDisabled: false };
}
