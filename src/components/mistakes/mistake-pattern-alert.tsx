"use client";

import Link from "next/link";
import { AlertTriangle, TrendingDown, ShieldCheck, PauseCircle } from "lucide-react";
import { useMistakePatterns } from "@/hooks/use-analytics";
import { useFilters } from "@/hooks/use-filters";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function MistakePatternPanel() {
  const { accountId } = useFilters();
  const { data, isLoading } = useMistakePatterns(accountId ?? undefined);

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const repeated = data?.repeatedMistakes ?? [];
  const streaks = data?.setupLossStreaks ?? [];
  const hasInsights = repeated.length > 0 || streaks.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-loss" />
        <h3 className="text-sm font-semibold text-foreground">Behavioral Alerts</h3>
      </div>

      {data?.autoDetectDisabled ? (
        <EmptyState
          icon={PauseCircle}
          title="Automatic detection is off"
          description="Turn it back on in Settings to surface repeated mistakes and losing streaks here."
          className="mt-3 border-none py-6"
          action={
            <Link href="/settings" className="text-xs font-medium text-primary hover:underline">
              Go to Settings
            </Link>
          }
        />
      ) : !hasInsights ? (
        <EmptyState
          icon={ShieldCheck}
          title="No repeated mistakes detected"
          description="Keep journaling — patterns will surface here automatically."
          className="mt-3 border-none py-6"
        />
      ) : (
        <div className="mt-3 space-y-3">
          {repeated.slice(0, 3).map((insight) => (
            <div key={insight.mistakeId} className="rounded-xl border border-loss/20 bg-loss/5 p-3">
              <p className="text-xs font-semibold text-foreground">Repeated mistake</p>
              <p className="mt-1 text-sm text-foreground">
                You&apos;ve recorded <span className="font-medium">&ldquo;{insight.label}&rdquo;</span> {insight.occurrences} times in the
                last {insight.windowDays} days.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {insight.lossCount} of these resulted in losses
                {insight.deltaWinRate != null && (
                  <>
                    {" "}
                    — win rate is {Math.abs(insight.deltaWinRate).toFixed(0)} pts{" "}
                    {insight.deltaWinRate < 0 ? "lower" : "higher"} than trades without it.
                  </>
                )}
              </p>
              <p className="mt-1 text-xs font-medium text-loss">P&L impact: {formatCurrency(insight.pnlImpact, { showSign: true })}</p>
            </div>
          ))}

          {streaks.slice(0, 2).map((streak) => (
            <div key={streak.strategyId} className="rounded-xl border border-loss/20 bg-loss/5 p-3">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-loss" />
                <p className="text-xs font-semibold text-foreground">Losing streak</p>
              </div>
              <p className="mt-1 text-sm text-foreground">
                &ldquo;{streak.strategyName}&rdquo; has {streak.consecutiveLosses} consecutive losses. Review this setup before
                taking it again.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
