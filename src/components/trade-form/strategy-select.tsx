"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStrategies, useCreateStrategy } from "@/hooks/use-reference-data";

const ADD_NEW = "__add_new__";

export function StrategySelect({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { data: strategies = [] } = useStrategies();
  const createStrategy = useCreateStrategy();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const strategy = await createStrategy.mutateAsync({ name: name.trim() });
      onChange(strategy.id);
      setOpen(false);
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add strategy.");
    }
  }

  return (
    <>
      <Select
        value={value ?? undefined}
        onValueChange={(v) => (v === ADD_NEW ? setOpen(true) : onChange(v))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select strategy (optional)" />
        </SelectTrigger>
        <SelectContent>
          {strategies.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ADD_NEW}>+ Add new strategy</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add strategy</DialogTitle>
            <DialogDescription>Create a new strategy to tag your trades with.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="strategy-name">Name</Label>
            <Input id="strategy-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fair Value Gap" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createStrategy.isPending}>
              {createStrategy.isPending ? "Adding..." : "Add strategy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
