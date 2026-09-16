"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrades } from "@/hooks/use-trades";
import { useFilters } from "@/hooks/use-filters";
import { formatCompactCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DayTradesDrawer } from "@/components/calendar/day-trades-drawer";
import { ChartSkeleton } from "@/components/shared/skeletons";

export function CalendarGrid() {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { asQuery } = useFilters();

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const { data: trades = [], isLoading } = useTrades({
    ...asQuery,
    dateFrom: gridStart.toISOString(),
    dateTo: gridEnd.toISOString(),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; hasWin: boolean; hasLoss: boolean }>();
    for (const t of trades) {
      const key = format(new Date(t.entryDateTime), "yyyy-MM-dd");
      const entry = map.get(key) ?? { pnl: 0, count: 0, hasWin: false, hasLoss: false };
      entry.count += 1;
      if (t.actualPnl != null) {
        entry.pnl += t.actualPnl;
        if (t.result === "WIN") entry.hasWin = true;
        if (t.result === "LOSS") entry.hasLoss = true;
      }
      map.set(key, entry);
    }
    return map;
  }, [trades]);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setMonth(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4"><ChartSkeleton height={480} /></div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const info = byDay.get(key);
              const inMonth = isSameMonth(day, month);
              const isProfitable = info && info.pnl > 0;
              const isLosing = info && info.pnl < 0;
              const isFlat = info && info.pnl === 0 && info.count > 0;

              return (
                <button
                  key={key}
                  onClick={() => info && setSelectedDay(key)}
                  disabled={!info}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-xl border p-1.5 text-xs transition-colors",
                    !inMonth && "opacity-40",
                    !info && "border-transparent",
                    isProfitable && "border-profit/30 bg-profit/10 hover:bg-profit/15",
                    isLosing && "border-loss/30 bg-loss/10 hover:bg-loss/15",
                    isFlat && "border-border bg-muted/50",
                    isToday(day) && "ring-2 ring-primary ring-offset-2 ring-offset-card"
                  )}
                >
                  <span className={cn("font-medium", isToday(day) && "text-primary")}>{format(day, "d")}</span>
                  {info && (
                    <>
                      <span className={cn("mt-0.5 text-[10px] font-semibold tabular-nums", isProfitable && "text-profit", isLosing && "text-loss")}>
                        {formatCompactCurrency(info.pnl)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{info.count} trade{info.count > 1 ? "s" : ""}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <DayTradesDrawer date={selectedDay} open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)} />
    </div>
  );
}
