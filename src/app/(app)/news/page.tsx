"use client";

import { useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { Newspaper, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { useNewsCalendar, type NewsEventDTO } from "@/hooks/use-news";
import { cn } from "@/lib/utils";

const IMPACT_STYLES: Record<string, string> = {
  High: "bg-loss/10 text-loss border-loss/20",
  Medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  Low: "bg-muted text-muted-foreground border-border",
};

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "CNY"];

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

function groupByDay(events: NewsEventDTO[]) {
  const groups = new Map<string, NewsEventDTO[]>();
  for (const event of events) {
    const key = format(new Date(event.date), "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

export default function NewsPage() {
  const [country, setCountry] = useState<string>("all");
  const [impact, setImpact] = useState<string>("all");
  const { data: events = [], isLoading, isError } = useNewsCalendar({
    country: country === "all" ? undefined : country,
    impact: impact === "all" ? undefined : impact,
  });

  const grouped = useMemo(() => groupByDay(events), [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">News</h1>
          <p className="text-sm text-muted-foreground">
            Economic calendar from{" "}
            <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              ForexFactory <ExternalLink className="h-3 w-3" />
            </a>
            . High-impact events get an automatic alert — configure in Settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={impact} onValueChange={setImpact}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Impact</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : isError || events.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={isError ? "Couldn't load the calendar" : "No events match these filters"}
          description={isError ? "The ForexFactory feed may be temporarily unavailable — try again shortly." : "Try a different currency or impact filter."}
        />
      ) : (
        <div className="stagger-in space-y-5">
          {grouped.map(([dayKey, dayEvents]) => (
            <div key={dayKey} className="animate-in fade-in slide-in-from-bottom-1 rounded-2xl border border-border bg-card shadow-soft duration-300 ease-out">
              <div className="border-b border-border px-5 py-3">
                <h3 className="text-sm font-semibold">{dayLabel(new Date(dayEvents[0].date))}</h3>
              </div>
              <div className="divide-y divide-border">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-accent/40",
                      event.impact === "High" && "hover:bg-loss/5"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {format(new Date(event.date), "h:mm a")}
                      </span>
                      <Badge variant="outline" className="w-12 shrink-0 justify-center text-[11px]">{event.country}</Badge>
                      <span className="truncate text-sm text-foreground">{event.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      {(event.forecast || event.previous) && (
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {event.forecast && <>F: {event.forecast}</>}
                          {event.forecast && event.previous && "  "}
                          {event.previous && <>P: {event.previous}</>}
                        </span>
                      )}
                      <Badge variant="outline" className={cn("text-[11px]", IMPACT_STYLES[event.impact])}>{event.impact}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
