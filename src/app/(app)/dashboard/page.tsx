"use client";

import { useState } from "react";
import {
  Wallet,
  Target,
  ListChecks,
  TrendingUp,
  TrendingDown,
  Scale,
  ArrowUpCircle,
  ArrowDownCircle,
  Flame,
  Snowflake,
  Percent,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EquityCurveChart } from "@/components/dashboard/equity-curve-chart";
import { RecentTradesList } from "@/components/dashboard/recent-trades-list";
import { MistakePatternPanel } from "@/components/mistakes/mistake-pattern-alert";
import { MetricGridSkeleton } from "@/components/shared/skeletons";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { useFilters } from "@/hooks/use-filters";
import { formatCurrency, formatPercent, formatRR } from "@/lib/format";
import type { EquityRange } from "@/lib/constants";

export default function DashboardPage() {
  const [range, setRange] = useState<EquityRange>("3M");
  const { asQuery } = useFilters();
  const { data, isLoading } = useAnalyticsSummary({ ...asQuery, range });

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your trading performance at a glance.</p>
      </div>

      {isLoading || !summary ? (
        <MetricGridSkeleton count={8} />
      ) : (
        <div className="stagger-in grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard
            label="Total P&L"
            value={summary.totalPnl}
            formatFn={(v) => formatCurrency(v, { showSign: true })}
            tone={summary.totalPnl >= 0 ? "profit" : "loss"}
            icon={Wallet}
          />
          <MetricCard
            label="Win Rate"
            value={summary.winRate ?? 0}
            formatFn={(v) => formatPercent(v)}
            icon={Percent}
            trend={
              summary.winRate != null
                ? { direction: summary.winRate >= 50 ? "up" : "down", label: `${summary.winningTrades}W / ${summary.losingTrades}L` }
                : null
            }
          />
          <MetricCard label="Total Trades" value={summary.totalTrades} icon={ListChecks} />
          <MetricCard label="Winning Trades" value={summary.winningTrades} tone="profit" icon={ArrowUpCircle} />
          <MetricCard label="Losing Trades" value={summary.losingTrades} tone="loss" icon={ArrowDownCircle} />
          <MetricCard
            label="Average R:R"
            value={summary.avgRR ?? 0}
            formatFn={(v) => formatRR(v)}
            icon={Scale}
          />
          <MetricCard
            label="Average Win"
            value={summary.avgWin ?? 0}
            formatFn={(v) => formatCurrency(v)}
            tone="profit"
            icon={TrendingUp}
          />
          <MetricCard
            label="Average Loss"
            value={summary.avgLoss ?? 0}
            formatFn={(v) => formatCurrency(v)}
            tone="loss"
            icon={TrendingDown}
          />
          <MetricCard
            label="Profit Factor"
            value={summary.profitFactor ?? 0}
            formatFn={(v) => v.toFixed(2)}
            icon={Target}
          />
          <MetricCard
            label="Largest Win"
            value={summary.largestWin ?? 0}
            formatFn={(v) => formatCurrency(v)}
            tone="profit"
            icon={ArrowUpCircle}
          />
          <MetricCard
            label="Largest Loss"
            value={summary.largestLoss ?? 0}
            formatFn={(v) => formatCurrency(v)}
            tone="loss"
            icon={ArrowDownCircle}
          />
          <MetricCard
            label={summary.currentStreak.type === "LOSS" ? "Losing Streak" : "Winning Streak"}
            value={summary.currentStreak.type === "NONE" ? 0 : summary.currentStreak.count}
            icon={summary.currentStreak.type === "LOSS" ? Snowflake : Flame}
            tone={summary.currentStreak.type === "LOSS" ? "loss" : summary.currentStreak.type === "WIN" ? "profit" : "default"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <EquityCurveChart data={data?.equitySeries ?? []} isLoading={isLoading} range={range} onRangeChange={setRange} />
          <RecentTradesList />
        </div>
        <div className="space-y-6">
          <MistakePatternPanel />
        </div>
      </div>
    </div>
  );
}
