"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { EQUITY_RANGES, type EquityRange } from "@/lib/constants";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { LineChart as LineChartIcon } from "lucide-react";

export interface EquityPoint {
  date: string;
  equity: number;
  pnl: number;
  drawdown: number;
}

function EquityTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: EquityPoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <p className="font-medium text-popover-foreground">{format(new Date(point.date), "MMM d, yyyy · HH:mm")}</p>
      <p className="mt-1 text-muted-foreground">
        Equity: <span className="font-medium text-popover-foreground">{formatCurrency(point.equity)}</span>
      </p>
      <p className={cn("text-muted-foreground", point.pnl >= 0 ? "" : "")}>
        Trade P&L:{" "}
        <span className={cn("font-medium", point.pnl >= 0 ? "text-profit" : "text-loss")}>
          {formatCurrency(point.pnl, { showSign: true })}
        </span>
      </p>
    </div>
  );
}

export function EquityCurveChart({
  data,
  isLoading,
  range,
  onRangeChange,
}: {
  data: EquityPoint[];
  isLoading?: boolean;
  range: EquityRange;
  onRangeChange: (range: EquityRange) => void;
}) {
  const isPositive = data.length ? data[data.length - 1].equity >= 0 : true;
  const strokeColor = isPositive ? "var(--profit)" : "var(--loss)";
  const maxDrawdown = data.length ? Math.min(...data.map((d) => d.drawdown)) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Equity Curve</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: strokeColor }} /> Equity
            </span>
            {data.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-loss/50" /> Drawdown (max {formatCurrency(maxDrawdown)})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5">
          {EQUITY_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-72">
        {isLoading ? (
          <ChartSkeleton height={288} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={LineChartIcon}
            title="No closed trades yet"
            description="Your equity curve will appear once you close a trade."
            className="h-full border-none py-0"
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(new Date(d), "MMM d")}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) => formatCompactCurrency(v)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
              <Tooltip content={<EquityTooltip />} />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="var(--loss)"
                strokeWidth={1}
                strokeOpacity={0.4}
                fill="var(--loss)"
                fillOpacity={0.08}
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke={strokeColor}
                strokeWidth={2}
                fill="url(#equityFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
