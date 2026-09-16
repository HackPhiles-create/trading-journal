"use client";

import { useState } from "react";
import { Plus, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import { useAssets, useCreateAsset, useDeleteAsset, type AssetDTO } from "@/hooks/use-reference-data";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { ASSET_CLASSES, type AssetClass } from "@/lib/constants";
import { formatCurrency, formatPercent, formatRR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function AssetsPage() {
  const { data: assets = [], isLoading } = useAssets();
  const { data: summary } = useAnalyticsSummary();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AssetDTO | null>(null);

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("OTHER");

  const perfByAsset = new Map((summary?.performanceByAsset ?? []).map((p) => [p.assetId, p]));

  async function handleCreate() {
    if (!symbol.trim() || !name.trim()) {
      toast.error("Symbol and name are required.");
      return;
    }
    try {
      await createAsset.mutateAsync({ symbol: symbol.toUpperCase(), name, assetClass, contractSize: 1 });
      toast.success("Asset added.");
      setOpen(false);
      setSymbol("");
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add asset.");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteAsset.mutateAsync(pendingDelete.id);
      toast.success("Asset deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete asset.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">Manage tradable instruments and per-asset analytics.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : assets.length === 0 ? (
        <EmptyState icon={Layers} title="No assets yet" description="Add your first tradable instrument." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => {
            const perf = perfByAsset.get(a.id);
            return (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{a.symbol}</p>
                      <Badge variant="outline" className="text-[10px]">{a.assetClass}</Badge>
                      {a.isCustom && <Badge variant="secondary" className="text-[10px]">CUSTOM</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.name}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-loss" onClick={() => setPendingDelete(a)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-semibold tabular-nums">{perf?.trades ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Trades</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold tabular-nums">{formatPercent(perf?.winRate ?? null)}</p>
                    <p className="text-[10px] text-muted-foreground">Win Rate</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold tabular-nums">{formatRR(perf?.avgRR ?? null)}</p>
                    <p className="text-[10px] text-muted-foreground">Avg R:R</p>
                  </div>
                </div>
                {perf && (
                  <p className={cn("mt-3 text-center text-sm font-semibold tabular-nums", perf.totalPnl >= 0 ? "text-profit" : "text-loss")}>
                    {formatCurrency(perf.totalPnl, { showSign: true })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add asset</DialogTitle>
            <DialogDescription>Add a new tradable instrument to your journal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-symbol">Symbol</Label>
              <Input id="asset-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. SOLUSD" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-name">Name</Label>
              <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Solana / US Dollar" />
            </div>
            <div className="space-y-1.5">
              <Label>Asset class</Label>
              <Select value={assetClass} onValueChange={(v) => setAssetClass(v as AssetClass)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createAsset.isPending}>{createAsset.isPending ? "Adding..." : "Add asset"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.symbol}"?`}
        description="Assets used by existing trades cannot be deleted. This cannot be undone."
        confirmLabel="Delete Asset"
        onConfirm={handleDelete}
      />
    </div>
  );
}
