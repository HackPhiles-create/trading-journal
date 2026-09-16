// Local-SQLite port of lib/analytics/mistake-patterns.ts — same computation,
// the only thing that changes is how the raw trade rows are fetched.
import { queryAll } from "@/lib/local/db";
import { MISTAKE_PATTERN_WINDOW_DAYS, MISTAKE_PATTERN_MIN_OCCURRENCES, SETUP_LOSS_STREAK_MIN } from "@/lib/constants";
import type { RepeatedMistakeInsight, SetupLossStreakInsight } from "@/lib/analytics/mistake-patterns";

interface LocalTradeRow {
  id: string;
  accountId: string;
  strategyId: string | null;
  entryDateTime: string;
  status: string;
  result: string | null;
  actualPnl: number | null;
}

export async function detectRepeatedMistakesLocal(opts: {
  accountId?: string | null;
  windowDays?: number;
  minOccurrences?: number;
}): Promise<RepeatedMistakeInsight[]> {
  const windowDays = opts.windowDays ?? MISTAKE_PATTERN_WINDOW_DAYS;
  const minOccurrences = opts.minOccurrences ?? MISTAKE_PATTERN_MIN_OCCURRENCES;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const trades = await queryAll<LocalTradeRow>(
    `SELECT id, accountId, strategyId, entryDateTime, status, result, actualPnl FROM trades
     WHERE entryDateTime >= ? AND status = 'CLOSED' ${opts.accountId ? "AND accountId = ?" : ""}`,
    opts.accountId ? [since, opts.accountId] : [since]
  );
  if (trades.length === 0) return [];

  const tradeIds = trades.map((t) => t.id);
  const tagRows = await queryAll<{ tradeId: string; mistakeId: string; label: string }>(
    `SELECT tm.tradeId, tm.mistakeId, m.label
     FROM trade_mistakes tm JOIN mistakes m ON m.id = tm.mistakeId
     WHERE tm.tradeId IN (${tradeIds.map(() => "?").join(",")})`,
    tradeIds
  );

  const tradeById = new Map(trades.map((t) => [t.id, t]));
  const byMistake = new Map<string, { label: string; tradeIds: string[] }>();
  for (const tag of tagRows) {
    if (!byMistake.has(tag.mistakeId)) byMistake.set(tag.mistakeId, { label: tag.label, tradeIds: [] });
    byMistake.get(tag.mistakeId)!.tradeIds.push(tag.tradeId);
  }

  const insights: RepeatedMistakeInsight[] = [];
  for (const [mistakeId, { label, tradeIds: flaggedIds }] of byMistake) {
    if (flaggedIds.length < minOccurrences) continue;
    const flagged = flaggedIds.map((id) => tradeById.get(id)!).filter(Boolean);
    const flaggedIdSet = new Set(flaggedIds);
    const rest = trades.filter((t) => !flaggedIdSet.has(t.id));

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

export async function detectSetupLossStreaksLocal(opts: {
  accountId?: string | null;
  minConsecutiveLosses?: number;
}): Promise<SetupLossStreakInsight[]> {
  const minConsecutiveLosses = opts.minConsecutiveLosses ?? SETUP_LOSS_STREAK_MIN;

  const trades = await queryAll<LocalTradeRow & { strategyName: string }>(
    `SELECT t.id, t.accountId, t.strategyId, t.entryDateTime, t.status, t.result, t.actualPnl, s.name as strategyName
     FROM trades t JOIN strategies s ON s.id = t.strategyId
     WHERE t.status = 'CLOSED' AND t.strategyId IS NOT NULL ${opts.accountId ? "AND t.accountId = ?" : ""}
     ORDER BY t.entryDateTime DESC`,
    opts.accountId ? [opts.accountId] : []
  );

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
      insights.push({ strategyId, strategyName: group[0].strategyName ?? "Unknown", consecutiveLosses: count, tradeIds: streakIds });
    }
  }

  return insights.sort((a, b) => b.consecutiveLosses - a.consecutiveLosses);
}
