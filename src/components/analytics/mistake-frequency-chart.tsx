"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle } from "lucide-react";
import type { AnalyticsSummaryDTO } from "@/hooks/use-analytics";

export function MistakeFrequencyChart({ data }: { data: AnalyticsSummaryDTO["mistakeFrequency"] }) {
  const chartData = [...data].sort((a, b) => b.occurrences - a.occurrences).slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-foreground">Mistake Frequency</h3>
      <p className="text-xs text-muted-foreground">Most common recorded mistakes</p>
      <div className="mt-4 h-64">
        {chartData.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No mistakes recorded" description="Great discipline — or start tagging mistakes on trade close." className="h-full border-none py-0" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" opacity={0.6} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
                      <p className="font-medium text-popover-foreground">{d.label}</p>
                      <p className="text-muted-foreground">{d.occurrences} occurrences · {d.lossCount} losses</p>
                    </div>
                  );
                }}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              />
              <Bar dataKey="occurrences" fill="var(--loss)" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
