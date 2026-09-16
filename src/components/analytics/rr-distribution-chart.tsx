"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { calculateRR } from "@/lib/trading-math";
import type { TradeDTO } from "@/hooks/use-trades";
import { EmptyState } from "@/components/shared/empty-state";
import { Scale } from "lucide-react";

const BUCKETS = [
  { label: "<1", min: -Infinity, max: 1 },
  { label: "1-2", min: 1, max: 2 },
  { label: "2-3", min: 2, max: 3 },
  { label: "3-4", min: 3, max: 4 },
  { label: "4+", min: 4, max: Infinity },
];

export function RRDistributionChart({ trades }: { trades: TradeDTO[] }) {
  const data = useMemo(() => {
    const counts = BUCKETS.map((b) => ({ label: b.label, count: 0 }));
    for (const t of trades) {
      const rr = calculateRR({ direction: t.direction as never, entry: t.entryPrice, sl: t.stopLoss, tp: t.takeProfit, lotSize: t.lotSize, contractSize: t.asset.contractSize });
      if (rr.rrRatio == null) continue;
      const idx = BUCKETS.findIndex((b) => rr.rrRatio! >= b.min && rr.rrRatio! < b.max);
      if (idx >= 0) counts[idx].count++;
    }
    return counts;
  }, [trades]);

  const hasData = data.some((d) => d.count > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="text-sm font-semibold text-foreground">R:R Distribution</h3>
      <p className="text-xs text-muted-foreground">Planned risk:reward across all trades</p>
      <div className="mt-4 h-56">
        {!hasData ? (
          <EmptyState icon={Scale} title="Not enough data yet" className="h-full border-none py-0" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
                      1:{payload[0].payload.label} — <span className="font-medium">{payload[0].payload.count} trades</span>
                    </div>
                  );
                }}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
