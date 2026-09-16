"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, Trash2, CheckCircle2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { calculateRR } from "@/lib/trading-math";
import { formatCurrency, formatPrice, formatRR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDeleteTrade, type TradeDTO } from "@/hooks/use-trades";
import { toast } from "sonner";

const RESULT_STYLES: Record<string, string> = {
  WIN: "bg-profit/10 text-profit border-profit/20",
  LOSS: "bg-loss/10 text-loss border-loss/20",
  BREAKEVEN: "bg-muted text-muted-foreground border-border",
};

export function TradeDetailHeader({ trade, onCloseTrade }: { trade: TradeDTO; onCloseTrade: () => void }) {
  const router = useRouter();
  const deleteTrade = useDeleteTrade();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rr = calculateRR({
    direction: trade.direction as never,
    entry: trade.entryPrice,
    sl: trade.stopLoss,
    tp: trade.takeProfit,
    lotSize: trade.lotSize,
    contractSize: trade.asset.contractSize,
  });

  async function handleDelete() {
    try {
      await deleteTrade.mutateAsync(trade.id);
      toast.success("Trade deleted.");
      router.push("/journal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete trade.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", trade.direction === "BUY" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
            {trade.direction === "BUY" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{trade.asset.symbol}</h1>
              <Badge variant="outline">{trade.direction}</Badge>
              {trade.result ? (
                <Badge variant="outline" className={RESULT_STYLES[trade.result]}>{trade.result}</Badge>
              ) : (
                <Badge variant="outline">OPEN</Badge>
              )}
              {trade.isDemo && <Badge variant="secondary" className="text-[10px]">DEMO</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(trade.entryDateTime), "EEEE, MMM d, yyyy 'at' HH:mm")} · {trade.account.name}
              {trade.strategy && ` · ${trade.strategy.name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trade.status === "OPEN" && (
            <Button size="sm" className="gap-1.5" onClick={onCloseTrade}>
              <CheckCircle2 className="h-4 w-4" /> Close Trade
            </Button>
          )}
          {trade.status === "CLOSED" && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onCloseTrade}>
              <Pencil className="h-4 w-4" /> Edit Result
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 text-loss hover:text-loss" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Field label="Entry" value={formatPrice(trade.entryPrice)} />
        <Field label="Stop Loss" value={formatPrice(trade.stopLoss)} tone="loss" />
        <Field label="Take Profit" value={formatPrice(trade.takeProfit)} tone="profit" />
        <Field label="Exit" value={trade.exitPrice != null ? formatPrice(trade.exitPrice) : "—"} />
        <Field label="R:R" value={formatRR(rr.rrRatio)} />
        <Field label="Lot Size" value={trade.lotSize} />
        <Field
          label="P&L"
          value={trade.actualPnl != null ? formatCurrency(trade.actualPnl, { showSign: true }) : "—"}
          tone={trade.actualPnl == null ? undefined : trade.actualPnl >= 0 ? "profit" : "loss"}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this trade?"
        description="This permanently removes the trade, its screenshots, and its journal notes. This cannot be undone."
        confirmLabel="Delete Trade"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string | number; tone?: "profit" | "loss" }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold tabular-nums", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>{value}</p>
    </div>
  );
}
