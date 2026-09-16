"use client";

import Link from "next/link";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useTrades } from "@/hooks/use-trades";
import { useFilters } from "@/hooks/use-filters";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const RESULT_STYLES: Record<string, string> = {
  WIN: "bg-profit/10 text-profit border-profit/20",
  LOSS: "bg-loss/10 text-loss border-loss/20",
  BREAKEVEN: "bg-muted text-muted-foreground border-border",
};

export function DayTradesDrawer({ date, open, onOpenChange }: { date: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { asQuery } = useFilters();
  const dayStart = date ? startOfDay(parseISO(date)) : null;
  const dayEnd = date ? endOfDay(parseISO(date)) : null;

  const { data: trades = [] } = useTrades(
    date && dayStart && dayEnd ? { ...asQuery, dateFrom: dayStart.toISOString(), dateTo: dayEnd.toISOString() } : undefined
  );

  const dayPnl = trades.reduce((sum, t) => sum + (t.actualPnl ?? 0), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{date ? format(parseISO(date), "EEEE, MMMM d, yyyy") : ""}</SheetTitle>
          <SheetDescription>
            {trades.length} trade{trades.length !== 1 ? "s" : ""} · Net {formatCurrency(dayPnl, { showSign: true })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2 overflow-y-auto px-4 pb-4">
          {trades.map((t) => (
            <Link
              key={t.id}
              href={`/journal/${t.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", t.direction === "BUY" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
                  {t.direction === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.asset.symbol}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.entryDateTime), "HH:mm")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.result ? (
                  <Badge variant="outline" className={cn("text-[11px]", RESULT_STYLES[t.result])}>{t.result}</Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px]">OPEN</Badge>
                )}
                <span className={cn("text-sm font-medium tabular-nums", (t.actualPnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                  {t.actualPnl != null ? formatCurrency(t.actualPnl, { showSign: true }) : "—"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
