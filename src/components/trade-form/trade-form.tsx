"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssetCombobox } from "@/components/trade-form/asset-combobox";
import { StrategySelect } from "@/components/trade-form/strategy-select";
import { ChecklistEditor } from "@/components/trade-form/checklist-editor";
import { RRPanel } from "@/components/trade-form/rr-panel";
import { ValidationBanner } from "@/components/trade-form/validation-banner";
import { useAccounts } from "@/hooks/use-accounts";
import { useAssets } from "@/hooks/use-reference-data";
import { useCreateTrade, useTrades } from "@/hooks/use-trades";
import { useSettings } from "@/hooks/use-settings";
import { useSound } from "@/hooks/use-sound";
import { useRRCalc } from "@/hooks/use-rr-calc";
import { validateTrade } from "@/lib/validation";
import { nowForDateTimeInput } from "@/lib/dates";
import { SESSIONS, type Direction, type Session } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function TradeForm() {
  const router = useRouter();
  const { data: accounts = [] } = useAccounts();
  const { data: assets = [] } = useAssets();
  const { data: settings } = useSettings();
  const createTrade = useCreateTrade();
  const { playSuccess, playError } = useSound();

  // "" until the user picks one explicitly; falls back to the first loaded
  // account below so the field is never left blank once accounts arrive.
  const [accountIdOverride, setAccountIdOverride] = useState<string>("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("BUY");
  const [session, setSession] = useState<Session | "">("");
  const [entryDateTime, setEntryDateTime] = useState(nowForDateTimeInput());
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [reasoningText, setReasoningText] = useState("");
  const [marketCondition, setMarketCondition] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [entryReason, setEntryReason] = useState("");
  const [confluence, setConfluence] = useState("");
  const [riskReasoning, setRiskReasoning] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);

  const accountId = accountIdOverride || accounts[0]?.id || "";

  const selectedAsset = assets.find((a) => a.id === assetId);

  const rr = useRRCalc({
    direction,
    entry: entryPrice ? Number(entryPrice) : undefined,
    sl: stopLoss ? Number(stopLoss) : undefined,
    tp: takeProfit ? Number(takeProfit) : undefined,
    lotSize: lotSize ? Number(lotSize) : undefined,
    contractSize: selectedAsset?.contractSize,
  });

  const { data: relatedTrades = [] } = useTrades(accountId && assetId ? { accountId, assetId } : undefined);

  const validation = useMemo(
    () =>
      validateTrade({
        direction,
        entryPrice: entryPrice ? Number(entryPrice) : null,
        stopLoss: stopLoss ? Number(stopLoss) : null,
        takeProfit: takeProfit ? Number(takeProfit) : null,
        lotSize: lotSize ? Number(lotSize) : null,
        entryDateTime: entryDateTime ? new Date(entryDateTime) : null,
        assetId,
        accountId,
        preferredMinRR: settings?.preferredMinRR,
        existingTrades: relatedTrades.map((t) => ({
          id: t.id,
          accountId: t.accountId,
          assetId: t.assetId,
          direction: t.direction as Direction,
          entryPrice: t.entryPrice,
          entryDateTime: t.entryDateTime,
        })),
      }),
    [direction, entryPrice, stopLoss, takeProfit, lotSize, entryDateTime, assetId, accountId, settings?.preferredMinRR, relatedTrades]
  );

  // Only shows validation noise once the trader has actually started filling
  // in prices — an empty form shouldn't scream "required" at first paint.
  const hasStartedPricing = Boolean(entryPrice || stopLoss || takeProfit);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validation.errors.length > 0) {
      playError();
      toast.error(validation.errors[0].message);
      return;
    }
    if (!accountId || !assetId) {
      playError();
      toast.error("Select an account and asset.");
      return;
    }

    try {
      const { trade, warnings } = await createTrade.mutateAsync({
        accountId,
        assetId,
        strategyId,
        direction,
        session: session || null,
        entryDateTime: new Date(entryDateTime),
        entryPrice: Number(entryPrice),
        stopLoss: Number(stopLoss),
        takeProfit: Number(takeProfit),
        lotSize: Number(lotSize),
        reasoningText,
        marketCondition,
        confirmation,
        entryReason,
        confluence,
        riskReasoning,
        checklistAnswers: checklist.map((id) => ({ checklistItemId: id, checked: true })),
      });

      for (const w of warnings) toast.warning(w.message);
      playSuccess();
      toast.success("Trade logged.");
      router.push(`/journal/${trade.id}`);
    } catch (err) {
      playError();
      toast.error(err instanceof Error ? err.message : "Failed to save trade.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("BUY")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                  direction === "BUY" ? "border-profit bg-profit/10 text-profit" : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <ArrowUp className="h-4 w-4" /> Buy
              </button>
              <button
                type="button"
                onClick={() => setDirection("SELL")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-colors",
                  direction === "SELL" ? "border-loss bg-loss/10 text-loss" : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <ArrowDown className="h-4 w-4" /> Sell
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Asset</Label>
            <AssetCombobox value={assetId} onChange={setAssetId} />
          </div>

          <div className="space-y-1.5">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountIdOverride}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Session</Label>
            <Select value={session} onValueChange={(v) => setSession(v as Session)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select session (optional)" />
              </SelectTrigger>
              <SelectContent>
                {SESSIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Strategy / Setup</Label>
            <StrategySelect value={strategyId} onChange={setStrategyId} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entryDateTime">Date &amp; time</Label>
            <Input id="entryDateTime" type="datetime-local" value={entryDateTime} onChange={(e) => setEntryDateTime(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entryPrice">Entry price</Label>
            <Input id="entryPrice" inputMode="decimal" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lotSize">Lot size</Label>
            <Input id="lotSize" inputMode="decimal" value={lotSize} onChange={(e) => setLotSize(e.target.value)} placeholder="1.00" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stopLoss">Stop loss</Label>
            <Input id="stopLoss" inputMode="decimal" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="takeProfit">Take profit</Label>
            <Input id="takeProfit" inputMode="decimal" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </section>

      <RRPanel rr={rr} />

      {hasStartedPricing && <ValidationBanner errors={validation.errors} warnings={validation.warnings} />}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">Why did I take this trade?</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reasoningText">Explanation</Label>
            <Textarea
              id="reasoningText"
              value={reasoningText}
              onChange={(e) => setReasoningText(e.target.value)}
              placeholder="What did you see that made you take this trade?"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="marketCondition">Market condition</Label>
              <Input id="marketCondition" value={marketCondition} onChange={(e) => setMarketCondition(e.target.value)} placeholder="e.g. Trending, ranging..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmation">Confirmation</Label>
              <Input id="confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="What confirmed your entry?" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entryReason">Entry reason</Label>
              <Input id="entryReason" value={entryReason} onChange={(e) => setEntryReason(e.target.value)} placeholder="Primary reason for entry" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confluence">Confluence</Label>
              <Input id="confluence" value={confluence} onChange={(e) => setConfluence(e.target.value)} placeholder="Supporting factors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="riskReasoning">Risk reasoning</Label>
            <Textarea id="riskReasoning" value={riskReasoning} onChange={(e) => setRiskReasoning(e.target.value)} placeholder="Why this stop / size?" rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Setup checklist</Label>
            <ChecklistEditor
              checked={checklist}
              onToggle={(id, isChecked) => setChecklist((prev) => (isChecked ? [...prev, id] : prev.filter((x) => x !== id)))}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/journal")}>
          Cancel
        </Button>
        <Button type="submit" disabled={createTrade.isPending} className="gap-2">
          {createTrade.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Trade
        </Button>
      </div>
    </form>
  );
}
