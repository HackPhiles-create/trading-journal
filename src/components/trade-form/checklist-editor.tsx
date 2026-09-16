"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChecklistItems, useCreateChecklistItem } from "@/hooks/use-reference-data";

export function ChecklistEditor({
  checked,
  onToggle,
}: {
  checked: string[];
  onToggle: (checklistItemId: string, isChecked: boolean) => void;
}) {
  const { data: items = [] } = useChecklistItems();
  const createItem = useCreateChecklistItem();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");

  async function handleAdd() {
    if (!label.trim()) return;
    try {
      const item = await createItem.mutateAsync({ label: label.trim() });
      onToggle(item.id, true);
      setLabel("");
      setAdding(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add checklist item.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-accent/50"
          >
            <Checkbox checked={checked.includes(item.id)} onCheckedChange={(v) => onToggle(item.id, Boolean(v))} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      {adding ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Custom confluence item"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          />
          <Button size="sm" onClick={handleAdd} disabled={createItem.isPending}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add custom item
        </Button>
      )}
    </div>
  );
}
