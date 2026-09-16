"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { useTrades } from "@/hooks/use-trades";
import { useFilters } from "@/hooks/use-filters";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";

const RESULT_STYLES: Record<string, string> = {
  WIN: "bg-profit/10 text-profit border-profit/20",
  LOSS: "bg-loss/10 text-loss border-loss/20",
  BREAKEVEN: "bg-muted text-muted-foreground border-border",
};

export function RecentTradesList() {
  const { asQuery } = useFilters();
  const { data: trades = [], isLoading } = useTrades(asQuery);
  const recent = trades.slice(0, 6);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Trades</h3>
        <Link href="/journal" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : recent.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No trades yet"
          description="Log your first trade to see it here."
          className="border-none py-10"
        />
      ) : (
        <div className="divide-y divide-border">
          {recent.map((trade) => (
            <Link
              key={trade.id}
              href={`/journal/${trade.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    trade.direction === "BUY" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                  )}
                >
                  {trade.direction === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{trade.asset.symbol}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(trade.entryDateTime), "MMM d, HH:mm")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {trade.result ? (
                  <Badge variant="outline" className={cn("text-[11px]", RESULT_STYLES[trade.result])}>
                    {trade.result}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px]">
                    OPEN
                  </Badge>
                )}
                <span
                  className={cn(
                    "w-20 shrink-0 text-right text-sm font-medium tabular-nums",
                    trade.actualPnl == null ? "text-muted-foreground" : trade.actualPnl >= 0 ? "text-profit" : "text-loss"
                  )}
                >
                  {trade.actualPnl != null ? formatCurrency(trade.actualPnl, { showSign: true }) : "—"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
