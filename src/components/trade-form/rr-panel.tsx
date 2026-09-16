import { cn } from "@/lib/utils";
import { formatCurrency, formatRR } from "@/lib/format";
import type { RRResult } from "@/lib/trading-math";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";

export function RRPanel({ rr }: { rr: RRResult | null }) {
  if (!rr) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
        Enter entry, stop loss, take profit, and lot size to see your risk:reward calculation.
      </div>
    );
  }

  const isValid = rr.riskDistance > 0 && rr.rewardDistance > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Risk : Reward</h3>
        </div>
        {isValid && rr.rrRatio != null && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {formatRR(rr.rrRatio)}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Risk"
          value={isValid ? rr.riskDistance.toFixed(5).replace(/0+$/, "").replace(/\.$/, "") : "—"}
          icon={TrendingDown}
          tone="loss"
        />
        <Stat
          label="Reward"
          value={isValid ? rr.rewardDistance.toFixed(5).replace(/0+$/, "").replace(/\.$/, "") : "—"}
          icon={TrendingUp}
          tone="profit"
        />
        <Stat label="Potential Loss" value={isValid ? formatCurrency(rr.potentialLoss) : "—"} tone="loss" />
        <Stat label="Potential Profit" value={isValid ? formatCurrency(rr.potentialProfit) : "—"} tone="profit" />
      </div>

      {rr.riskPercent != null && (
        <p className="mt-3 text-xs text-muted-foreground">
          Risking <span className="font-medium text-foreground">{rr.riskPercent.toFixed(2)}%</span> of account balance.
        </p>
      )}

      {!isValid && (
        <p className="mt-3 text-xs font-medium text-loss">
          {rr.riskDistance <= 0 ? "Stop loss is on the wrong side of entry." : "Take profit is on the wrong side of entry."}
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "profit" | "loss";
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <p className={cn("mt-1 text-sm font-semibold tabular-nums", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>
        {value}
      </p>
    </div>
  );
}
