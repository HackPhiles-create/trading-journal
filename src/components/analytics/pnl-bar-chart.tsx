"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";

export interface BarDatum {
  label: string;
  value: number;
  trades?: number;
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BarDatum }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <p className="font-medium text-popover-foreground">{d.label}</p>
      <p className={d.value >= 0 ? "text-profit" : "text-loss"}>{formatCurrency(d.value, { showSign: true })}</p>
      {d.trades != null && <p className="text-muted-foreground">{d.trades} trades</p>}
    </div>
  );
}

export function PnlBarChart({ title, subtitle, data, height = 260 }: { title: string; subtitle?: string; data: BarDatum[]; height?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4" style={{ height }}>
        {data.length === 0 ? (
          <EmptyState icon={BarChart3} title="Not enough data yet" className="h-full border-none py-0" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompactCurrency(v)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.value >= 0 ? "var(--profit)" : "var(--loss)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
