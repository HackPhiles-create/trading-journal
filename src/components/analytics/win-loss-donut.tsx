"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import { PieChart as PieIcon } from "lucide-react";

export function WinLossDonut({ wins, losses, breakeven }: { wins: number; losses: number; breakeven: number }) {
  const total = wins + losses + breakeven;
  const data = [
    { name: "Wins", value: wins, color: "var(--profit)" },
    { name: "Losses", value: losses, color: "var(--loss)" },
    { name: "Breakeven", value: breakeven, color: "var(--muted-foreground)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-foreground">Win / Loss Distribution</h3>
      <div className="relative mt-2 h-64">
        {total === 0 ? (
          <EmptyState icon={PieIcon} title="Not enough data yet" className="h-full border-none py-0" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    return (
                      <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
                        {d.name}: <span className="font-medium">{d.value}</span> ({(((d.value as number) / total) * 100).toFixed(0)}%)
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums">{total}</span>
              <span className="text-xs text-muted-foreground">Total Trades</span>
            </div>
          </>
        )}
      </div>
      {total > 0 && (
        <div className="mt-3 flex items-center justify-center gap-4 text-xs">
          {data.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
