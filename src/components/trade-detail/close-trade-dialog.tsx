"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCloseTrade, type TradeDTO } from "@/hooks/use-trades";
import { useMistakes } from "@/hooks/use-reference-data";
import { useSound } from "@/hooks/use-sound";
import { suggestActualPnl } from "@/lib/trading-math";
import { nowForDateTimeInput } from "@/lib/dates";
import { EMOTIONAL_STATES, TRADE_RESULTS, type Direction, type EmotionalState, type TradeResult } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

export function CloseTradeDialog({ trade, open, onOpenChange }: { trade: TradeDTO; open: boolean; onOpenChange: (open: boolean) => void }) {
  const closeTrade = useCloseTrade(trade.id);
  const { data: mistakes = [] } = useMistakes();
  const { playSuccess, playError } = useSound();

  // First time closing a trade (no exitPrice yet), default the exit price to
  // whichever level matches the default "WIN" result (take profit) rather
  // than entry — otherwise the dialog opens showing Result: WIN but a $0
  // breakeven P&L, which is exactly the "doesn't show how much I won" gap.
  const defaultResult: TradeResult = (trade.result as TradeResult) ?? "WIN";
  function priceForResult(r: TradeResult): number {
    if (r === "WIN") return trade.takeProfit;
    if (r === "LOSS") return trade.stopLoss;
    return trade.entryPrice;
  }

  const [exitPrice, setExitPrice] = useState(
    trade.exitPrice != null ? String(trade.exitPrice) : String(priceForResult(defaultResult))
  );
  const [exitDateTime, setExitDateTime] = useState(trade.exitDateTime ? trade.exitDateTime.slice(0, 16) : nowForDateTimeInput());
  const [result, setResult] = useState<TradeResult>(defaultResult);
  const [actualPnl, setActualPnl] = useState(() => {
    if (trade.actualPnl != null) return String(trade.actualPnl);
    const { actualPnl: computed } = suggestActualPnl({
      direction: trade.direction as Direction,
      entry: trade.entryPrice,
      sl: trade.stopLoss,
      exit: priceForResult(defaultResult),
      lotSize: trade.lotSize,
      contractSize: trade.asset.contractSize,
    });
    return computed.toFixed(2);
  });
  const [overridden, setOverridden] = useState(false);
  // Tracks whether the user has hand-typed an exit price this session —
  // once they have, switching the Result dropdown no longer overwrites it
  // (they may be recording a partial win/loss with a custom exit).
  const [exitPriceTouched, setExitPriceTouched] = useState(false);
  const [emotionalState, setEmotionalState] = useState<EmotionalState | "">((trade.emotionalState as EmotionalState) ?? "");
  const [whatWentWell, setWhatWentWell] = useState(trade.whatWentWell ?? "");
  const [whatToImprove, setWhatToImprove] = useState(trade.whatToImprove ?? "");
  const [lessonLearned, setLessonLearned] = useState(trade.lessonLearned ?? "");
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>(trade.mistakes.map((m) => m.mistakeId));

  const [suggested, setSuggested] = useState(() => suggestActualPnl({
    direction: trade.direction as Direction,
    entry: trade.entryPrice,
    sl: trade.stopLoss,
    exit: Number(exitPrice),
    lotSize: trade.lotSize,
    contractSize: trade.asset.contractSize,
  }));

  function recomputeFromExit(price: number) {
    const next = suggestActualPnl({
      direction: trade.direction as Direction,
      entry: trade.entryPrice,
      sl: trade.stopLoss,
      exit: price,
      lotSize: trade.lotSize,
      contractSize: trade.asset.contractSize,
    });
    setSuggested(next);
    if (!overridden) setActualPnl(next.actualPnl.toFixed(2));
    return next;
  }

  // Recomputes the suggested P&L/result whenever the exit price actually
  // changes — handled here, in the event that causes it, rather than in an
  // effect reacting to state (React's recommended pattern for derived sync).
  function handleExitPriceChange(value: string) {
    setExitPrice(value);
    setExitPriceTouched(true);
    const price = Number(value);
    if (Number.isNaN(price)) return;
    const next = recomputeFromExit(price);
    if (!overridden) {
      setResult(next.actualPnl > 0.01 ? "WIN" : next.actualPnl < -0.01 ? "LOSS" : "BREAKEVEN");
    }
  }

  // Picking a Result directly (WIN/LOSS/BREAKEVEN) is the common path when
  // closing at exactly take profit / stop loss — auto-fill the exit price
  // from that level and compute the real $ amount immediately, instead of
  // requiring the user to separately type a matching exit price. Once they've
  // hand-typed a custom exit price (partial fill, slippage, etc.), this stops
  // touching it and only updates the result label itself.
  function handleResultChange(value: TradeResult) {
    setResult(value);
    if (exitPriceTouched) return;
    const price = priceForResult(value);
    setExitPrice(String(price));
    recomputeFromExit(price);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await closeTrade.mutateAsync({
        exitPrice: Number(exitPrice),
        exitDateTime: new Date(exitDateTime),
        result,
        actualPnl: Number(actualPnl),
        actualRMultiple: suggested?.actualRMultiple ?? null,
        pnlManuallyOverridden: overridden,
        emotionalState: emotionalState || null,
        whatWentWell,
        whatToImprove,
        lessonLearned,
        mistakes: selectedMistakes.map((id) => ({ mistakeId: id })),
      });
      playSuccess();
      toast.success("Trade closed.");
      onOpenChange(false);
    } catch (err) {
      playError();
      toast.error(err instanceof Error ? err.message : "Failed to close trade.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Close Trade</DialogTitle>
          <DialogDescription>Record the result and reflect on how it went.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exitPrice">Exit price</Label>
              <Input id="exitPrice" inputMode="decimal" value={exitPrice} onChange={(e) => handleExitPriceChange(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exitDateTime">Exit date/time</Label>
              <Input id="exitDateTime" type="datetime-local" value={exitDateTime} onChange={(e) => setExitDateTime(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Result</Label>
              <Select value={result} onValueChange={(v) => handleResultChange(v as TradeResult)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRADE_RESULTS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actualPnl">Actual P&L</Label>
              <Input
                id="actualPnl"
                inputMode="decimal"
                value={actualPnl}
                onChange={(e) => {
                  setActualPnl(e.target.value);
                  setOverridden(true);
                }}
                required
              />
            </div>
          </div>

          {suggested && (
            <p className="text-xs text-muted-foreground">
              Suggested from exit price: {formatCurrency(suggested.actualPnl, { showSign: true })}
              {suggested.actualRMultiple != null && ` (${suggested.actualRMultiple.toFixed(2)}R)`}
              {overridden && " — overridden"}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Emotional state</Label>
            <Select value={emotionalState} onValueChange={(v) => setEmotionalState(v as EmotionalState)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="How did you feel?" /></SelectTrigger>
              <SelectContent>
                {EMOTIONAL_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Mistakes made</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {mistakes.map((m) => (
                <label key={m.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs">
                  <Checkbox
                    checked={selectedMistakes.includes(m.id)}
                    onCheckedChange={(v) =>
                      setSelectedMistakes((prev) => (v ? [...prev, m.id] : prev.filter((x) => x !== m.id)))
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatWentWell">What went well</Label>
            <Textarea id="whatWentWell" rows={2} value={whatWentWell} onChange={(e) => setWhatWentWell(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatToImprove">What to improve</Label>
            <Textarea id="whatToImprove" rows={2} value={whatToImprove} onChange={(e) => setWhatToImprove(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lessonLearned">Lesson learned</Label>
            <Textarea id="lessonLearned" rows={2} value={lessonLearned} onChange={(e) => setLessonLearned(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={closeTrade.isPending}>{closeTrade.isPending ? "Saving..." : "Save & Close Trade"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
