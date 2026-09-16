import { AlertTriangle, TrendingDown } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MistakeCardData {
  label: string;
  occurrences: number;
  lossCount: number;
  winRateWithMistake: number | null;
  pnlImpact: number;
}

export function MistakeCard({ mistake }: { mistake: MistakeCardData }) {
  const lossShare = mistake.occurrences > 0 ? (mistake.lossCount / mistake.occurrences) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-loss/10 text-loss">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{mistake.label}</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            mistake.pnlImpact >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
          )}
        >
          {formatCurrency(mistake.pnlImpact, { showSign: true })}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold tabular-nums">{mistake.occurrences}</p>
          <p className="text-[11px] text-muted-foreground">Occurrences</p>
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-loss">{mistake.lossCount}</p>
          <p className="text-[11px] text-muted-foreground">Losses</p>
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums">{formatPercent(mistake.winRateWithMistake)}</p>
          <p className="text-[11px] text-muted-foreground">Win Rate</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Share resulting in loss</span>
          <span>{lossShare.toFixed(0)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-loss" style={{ width: `${lossShare}%` }} />
        </div>
      </div>
    </div>
  );
}
