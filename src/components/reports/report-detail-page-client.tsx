"use client";

import { useParams } from "next/navigation";
import { format } from "date-fns";
import { FileText, Trophy, TrendingDown, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { ReportExportMenu } from "@/components/reports/report-export-menu";
import { useReport } from "@/hooks/use-reports";
import { formatCurrency, formatPercent, formatRR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ReportSnapshot {
  summary: {
    totalPnl: number;
    winRate: number | null;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgRR: number | null;
    avgWin: number | null;
    avgLoss: number | null;
    profitFactor: number | null;
    largestWin: number | null;
    largestLoss: number | null;
  };
  bestTrade: { id: string; asset: { symbol: string }; actualPnl: number } | null;
  worstTrade: { id: string; asset: { symbol: string }; actualPnl: number } | null;
  bestAsset: { symbol: string; totalPnl: number; trades: number } | null;
  worstAsset: { symbol: string; totalPnl: number; trades: number } | null;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  strategyPerformance: { name: string; trades: number; winRate: number | null; totalPnl: number }[];
  sessionPerformance: { session: string; trades: number; winRate: number | null; totalPnl: number }[];
  mostCommonMistakes: { label: string; occurrences: number; lossCount: number; pnlImpact: number }[];
  maxDrawdown: number | null;
  behavioral: {
    hasEnoughData: boolean;
    bestSetup: { name: string; winRate: number | null; trades: number } | null;
    worstSetup: { name: string; winRate: number | null; trades: number } | null;
    overtradingDaysCount: number;
  } | null;
  keyObservations: string[];
}

function StatBox({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>{value}</p>
    </div>
  );
}

export function ReportDetailPageClient() {
  // See TradeDetailPageClient's comment — same reasoning for the native
  // static export's single placeholder path.
  const { reportId } = useParams<{ reportId: string }>();
  const { data: report, isLoading } = useReport(reportId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!report) {
    return <EmptyState icon={FileText} title="Report not found" />;
  }

  const snapshot = report.data as ReportSnapshot;
  const s = snapshot.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{report.type === "WEEKLY" ? "Weekly" : "Monthly"} Report</h1>
            <Badge variant="outline">{report.accountId ? "Single Account" : "All Accounts"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(report.periodStart), "MMM d")} – {format(new Date(report.periodEnd), "MMM d, yyyy")}
          </p>
        </div>
        <ReportExportMenu accountId={report.accountId} dateFrom={report.periodStart} dateTo={report.periodEnd} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Total P&L" value={formatCurrency(s.totalPnl, { showSign: true })} tone={s.totalPnl >= 0 ? "profit" : "loss"} />
        <StatBox label="Win Rate" value={formatPercent(s.winRate)} />
        <StatBox label="Total Trades" value={String(s.totalTrades)} />
        <StatBox label="Avg R:R" value={formatRR(s.avgRR)} />
        <StatBox label="Profit Factor" value={s.profitFactor?.toFixed(2) ?? "—"} />
        <StatBox label="Avg Win" value={formatCurrency(s.avgWin ?? 0)} tone="profit" />
        <StatBox label="Avg Loss" value={formatCurrency(s.avgLoss ?? 0)} tone="loss" />
        {snapshot.maxDrawdown != null && <StatBox label="Max Drawdown" value={formatCurrency(snapshot.maxDrawdown)} tone="loss" />}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Key Observations</h3>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-foreground">
          {snapshot.keyObservations.length ? (
            snapshot.keyObservations.map((o, i) => <li key={i}>• {o}</li>)
          ) : (
            <li className="text-muted-foreground">Not enough data yet for observations.</li>
          )}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-profit" /><h3 className="text-sm font-semibold">Best Trade</h3></div>
          {snapshot.bestTrade ? (
            <p className="mt-2 text-sm">{snapshot.bestTrade.asset.symbol} — <span className="font-semibold text-profit">{formatCurrency(snapshot.bestTrade.actualPnl, { showSign: true })}</span></p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No closed trades in this period.</p>
          )}
          {snapshot.bestAsset && <p className="mt-1 text-xs text-muted-foreground">Best asset: {snapshot.bestAsset.symbol} ({formatCurrency(snapshot.bestAsset.totalPnl, { showSign: true })})</p>}
          {snapshot.bestDay && <p className="mt-1 text-xs text-muted-foreground">Best day: {format(new Date(snapshot.bestDay.date), "MMM d")} ({formatCurrency(snapshot.bestDay.pnl, { showSign: true })})</p>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-loss" /><h3 className="text-sm font-semibold">Worst Trade</h3></div>
          {snapshot.worstTrade ? (
            <p className="mt-2 text-sm">{snapshot.worstTrade.asset.symbol} — <span className="font-semibold text-loss">{formatCurrency(snapshot.worstTrade.actualPnl, { showSign: true })}</span></p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No closed trades in this period.</p>
          )}
          {snapshot.worstAsset && <p className="mt-1 text-xs text-muted-foreground">Worst asset: {snapshot.worstAsset.symbol} ({formatCurrency(snapshot.worstAsset.totalPnl, { showSign: true })})</p>}
          {snapshot.worstDay && <p className="mt-1 text-xs text-muted-foreground">Worst day: {format(new Date(snapshot.worstDay.date), "MMM d")} ({formatCurrency(snapshot.worstDay.pnl, { showSign: true })})</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Strategy Performance</h3>
          <div className="mt-3 space-y-2">
            {snapshot.strategyPerformance.length ? (
              snapshot.strategyPerformance.map((sp) => (
                <div key={sp.name} className="flex items-center justify-between text-sm">
                  <span>{sp.name} <span className="text-xs text-muted-foreground">({sp.trades})</span></span>
                  <span className={sp.totalPnl >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(sp.totalPnl, { showSign: true })}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No strategy data.</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Session Performance</h3>
          <div className="mt-3 space-y-2">
            {snapshot.sessionPerformance.length ? (
              snapshot.sessionPerformance.map((sp) => (
                <div key={sp.session} className="flex items-center justify-between text-sm">
                  <span>{sp.session} <span className="text-xs text-muted-foreground">({sp.trades})</span></span>
                  <span className={sp.totalPnl >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(sp.totalPnl, { showSign: true })}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No session data.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold">Mistake Analysis</h3>
        <div className="mt-3 space-y-2">
          {snapshot.mostCommonMistakes.length ? (
            snapshot.mostCommonMistakes.slice(0, 6).map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span>{m.label} <span className="text-xs text-muted-foreground">({m.occurrences} occurrences, {m.lossCount} losses)</span></span>
                <span className={m.pnlImpact >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(m.pnlImpact, { showSign: true })}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No mistakes recorded this period.</p>
          )}
        </div>
      </div>

      {snapshot.behavioral && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold">Behavioral Analysis</h3>
          {!snapshot.behavioral.hasEnoughData ? (
            <p className="mt-2 text-sm text-muted-foreground">Not enough data yet — behavioral analysis needs at least 10 trades in this period.</p>
          ) : (
            <div className="mt-3 space-y-1.5 text-sm">
              {snapshot.behavioral.bestSetup && (
                <p>Best setup: <span className="font-medium">{snapshot.behavioral.bestSetup.name}</span> ({formatPercent(snapshot.behavioral.bestSetup.winRate)} win rate, {snapshot.behavioral.bestSetup.trades} trades)</p>
              )}
              {snapshot.behavioral.worstSetup && (
                <p>Worst setup: <span className="font-medium">{snapshot.behavioral.worstSetup.name}</span> ({formatPercent(snapshot.behavioral.worstSetup.winRate)} win rate, {snapshot.behavioral.worstSetup.trades} trades)</p>
              )}
              <p>Overtrading days (&gt;5 trades): <span className="font-medium">{snapshot.behavioral.overtradingDaysCount}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
