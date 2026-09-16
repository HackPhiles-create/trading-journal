import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/shared/animated-number";
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: number;
  formatFn?: (n: number) => string;
  trend?: { direction: "up" | "down" | "neutral"; label: string } | null;
  icon?: LucideIcon;
  tone?: "default" | "profit" | "loss";
  style?: CSSProperties;
}

export function MetricCard({ label, value, formatFn, trend, icon: Icon, tone = "default", style }: MetricCardProps) {
  return (
    <div
      className="group animate-in fade-in slide-in-from-bottom-1 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-elevated"
      style={style}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/60 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.75} />}
      </div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss"
        )}
      >
        <AnimatedNumber value={value} formatFn={formatFn} />
      </div>
      {trend && (
        <div
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs font-medium",
            trend.direction === "up" && "text-profit",
            trend.direction === "down" && "text-loss",
            trend.direction === "neutral" && "text-muted-foreground"
          )}
        >
          {trend.direction === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
          {trend.direction === "down" && <ArrowDownRight className="h-3.5 w-3.5" />}
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
