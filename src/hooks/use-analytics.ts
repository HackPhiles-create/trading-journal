import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";
import { isNative } from "@/lib/data-source";
import { getAnalyticsSummaryLocal, getMistakePatternsLocal } from "@/lib/local/analytics";
import { rangeToDates } from "@/lib/dates";
import type { EquityRange } from "@/lib/constants";
import { EQUITY_RANGES } from "@/lib/constants";
import type { TradeFilterQuery } from "@/hooks/use-trades";

export interface AnalyticsSummaryDTO {
  summary: {
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
  };
  equitySeries: { date: string; pnl: number; equity: number; drawdown: number; tradeId: string }[];
  performanceByAsset: { assetId: string; symbol: string; trades: number; winRate: number | null; totalPnl: number; avgRR: number | null }[];
  strategyPerformance: { strategyId: string; name: string; trades: number; winRate: number | null; totalPnl: number; avgRR: number | null }[];
  sessionPerformance: { session: string; trades: number; winRate: number | null; totalPnl: number }[];
  dayOfWeek: { label: string; trades: number; pnl: number; winRate: number | null }[];
  hourOfDay: { hour: number; trades: number; pnl: number; winRate: number | null }[];
  mistakeFrequency: { mistakeId: string; label: string; occurrences: number; lossCount: number; winRateWithMistake: number | null; pnlImpact: number }[];
}

function buildQuery(filters?: TradeFilterQuery & { range?: string }) {
  if (!filters) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function resolveLocalRange(filters?: TradeFilterQuery & { range?: string }): { start?: Date; end?: Date } {
  if (!filters) return {};
  if (filters.dateFrom || filters.dateTo) {
    return { start: filters.dateFrom ? new Date(filters.dateFrom) : undefined, end: filters.dateTo ? new Date(filters.dateTo) : undefined };
  }
  if (filters.range && (EQUITY_RANGES as readonly string[]).includes(filters.range) && filters.range !== "ALL") {
    return rangeToDates(filters.range as EquityRange);
  }
  return {};
}

export function useAnalyticsSummary(filters?: TradeFilterQuery & { range?: string }) {
  return useQuery({
    queryKey: queryKeys.analyticsSummary(filters),
    queryFn: () =>
      isNative()
        ? getAnalyticsSummaryLocal({ ...resolveLocalRange(filters), filters })
        : fetchJson<AnalyticsSummaryDTO>(`/api/analytics/summary${buildQuery(filters)}`),
  });
}

export interface MistakePatternDTO {
  repeatedMistakes: {
    mistakeId: string;
    label: string;
    occurrences: number;
    lossCount: number;
    winRateWithMistake: number;
    winRateBaseline: number | null;
    deltaWinRate: number | null;
    pnlImpact: number;
    windowDays: number;
  }[];
  setupLossStreaks: {
    strategyId: string;
    strategyName: string;
    consecutiveLosses: number;
    tradeIds: string[];
  }[];
  autoDetectDisabled: boolean;
}

export function useMistakePatterns(accountId?: string) {
  return useQuery({
    queryKey: queryKeys.mistakePatterns(accountId),
    queryFn: () =>
      isNative()
        ? getMistakePatternsLocal(accountId)
        : fetchJson<MistakePatternDTO>(`/api/analytics/mistake-patterns${accountId ? `?accountId=${accountId}` : ""}`),
  });
}
