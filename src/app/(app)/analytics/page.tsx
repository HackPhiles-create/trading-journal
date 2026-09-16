"use client";

import { useState } from "react";
import { FilterBar } from "@/components/trade-table/filter-bar";
import { EquityCurveChart } from "@/components/dashboard/equity-curve-chart";
import { WinLossDonut } from "@/components/analytics/win-loss-donut";
import { RRDistributionChart } from "@/components/analytics/rr-distribution-chart";
import { PnlBarChart } from "@/components/analytics/pnl-bar-chart";
import { MistakeFrequencyChart } from "@/components/analytics/mistake-frequency-chart";
import { MetricGridSkeleton } from "@/components/shared/skeletons";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { useTrades } from "@/hooks/use-trades";
import { useFilters } from "@/hooks/use-filters";
import type { EquityRange } from "@/lib/constants";

function formatHour(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${period}`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<EquityRange>("3M");
  const { asQuery } = useFilters();
  const { data, isLoading } = useAnalyticsSummary({ ...asQuery, range });
  const { data: trades = [] } = useTrades(asQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Deep performance breakdowns across every dimension.</p>
      </div>

      <FilterBar />

      {isLoading || !data ? (
        <MetricGridSkeleton count={4} />
      ) : (
        <>
          <EquityCurveChart data={data.equitySeries} range={range} onRangeChange={setRange} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <WinLossDonut wins={data.summary.winningTrades} losses={data.summary.losingTrades} breakeven={data.summary.breakevenTrades} />
            <RRDistributionChart trades={trades} />
            <MistakeFrequencyChart data={data.mistakeFrequency} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PnlBarChart
              title="Performance by Asset"
              subtitle="Total P&L per instrument"
              data={data.performanceByAsset.map((a) => ({ label: a.symbol, value: a.totalPnl, trades: a.trades }))}
            />
            <PnlBarChart
              title="Performance by Strategy"
              subtitle="Total P&L per setup"
              data={data.strategyPerformance.map((s) => ({ label: s.name, value: s.totalPnl, trades: s.trades }))}
            />
            <PnlBarChart
              title="Performance by Session"
              subtitle="Total P&L per trading session"
              data={data.sessionPerformance.map((s) => ({ label: s.session, value: s.totalPnl, trades: s.trades }))}
            />
            <PnlBarChart
              title="Day-of-Week Performance"
              subtitle="Total P&L by weekday"
              data={data.dayOfWeek.map((d) => ({ label: d.label, value: d.pnl, trades: d.trades }))}
            />
          </div>

          <PnlBarChart
            title="Hour-of-Day Performance"
            subtitle="Total P&L by entry hour"
            height={220}
            data={data.hourOfDay.filter((h) => h.trades > 0).map((h) => ({ label: formatHour(h.hour), value: h.pnl, trades: h.trades }))}
          />
        </>
      )}
    </div>
  );
}
