import { NextResponse } from "next/server";
import {
  getTradesInRange,
  computeSummaryStats,
  computeEquitySeries,
  computePerformanceByAsset,
  computeStrategyPerformance,
  computeSessionPerformance,
  computeDayOfWeekPerformance,
  computeHourOfDayPerformance,
  computeMostCommonMistakes,
} from "@/lib/analytics/aggregate";
import { rangeToDates } from "@/lib/dates";
import type { EquityRange } from "@/lib/constants";
import { EQUITY_RANGES } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const range = searchParams.get("range");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let start: Date | undefined;
  let end: Date | undefined;
  if (dateFrom || dateTo) {
    start = dateFrom ? new Date(dateFrom) : undefined;
    end = dateTo ? new Date(dateTo) : undefined;
  } else if (range && (EQUITY_RANGES as readonly string[]).includes(range) && range !== "ALL") {
    const dates = rangeToDates(range as EquityRange);
    start = dates.start;
    end = dates.end;
  }

  const filters = {
    accountId: searchParams.get("accountId") ?? undefined,
    assetId: searchParams.get("assetId") ?? undefined,
    strategyId: searchParams.get("strategyId") ?? undefined,
    direction: (searchParams.get("direction") as never) ?? undefined,
    result: searchParams.get("result") ?? undefined,
    session: searchParams.get("session") ?? undefined,
    mistakeId: searchParams.get("mistakeId") ?? undefined,
  };

  const trades = await getTradesInRange({ start, end, filters });

  return NextResponse.json({
    summary: computeSummaryStats(trades),
    equitySeries: computeEquitySeries(trades),
    performanceByAsset: computePerformanceByAsset(trades),
    strategyPerformance: computeStrategyPerformance(trades),
    sessionPerformance: computeSessionPerformance(trades),
    dayOfWeek: computeDayOfWeekPerformance(trades),
    hourOfDay: computeHourOfDayPerformance(trades),
    mistakeFrequency: computeMostCommonMistakes(trades),
  });
}
