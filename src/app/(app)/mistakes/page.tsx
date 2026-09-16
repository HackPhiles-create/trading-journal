"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MistakeCard } from "@/components/mistakes/mistake-card";
import { MistakePatternPanel } from "@/components/mistakes/mistake-pattern-alert";
import { MetricGridSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle } from "lucide-react";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { useCreateMistake } from "@/hooks/use-reference-data";
import { useFilters } from "@/hooks/use-filters";

export default function MistakesPage() {
  const { asQuery } = useFilters();
  const { data, isLoading } = useAnalyticsSummary(asQuery);
  const createMistake = useCreateMistake();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");

  async function handleAdd() {
    if (!label.trim()) return;
    try {
      await createMistake.mutateAsync({ label: label.trim() });
      toast.success("Mistake added.");
      setOpen(false);
      setLabel("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add mistake.");
    }
  }

  const mistakes = [...(data?.mistakeFrequency ?? [])].sort((a, b) => b.occurrences - a.occurrences);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mistakes</h1>
          <p className="text-sm text-muted-foreground">Track recurring mistakes before they cost you again.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Custom Mistake
        </Button>
      </div>

      <MistakePatternPanel />

      {isLoading ? (
        <MetricGridSkeleton count={6} />
      ) : mistakes.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No mistakes recorded yet" description="Tag mistakes when you close a trade — patterns will show up here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mistakes.map((m) => (
            <MistakeCard key={m.mistakeId} mistake={m} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add custom mistake</DialogTitle>
            <DialogDescription>Add a new mistake tag to use when closing trades.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="mistake-label">Label</Label>
            <Input id="mistake-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Ignored higher timeframe" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMistake.isPending}>{createMistake.isPending ? "Adding..." : "Add mistake"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
