"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssets, useCreateAsset } from "@/hooks/use-reference-data";
import { ASSET_CLASSES } from "@/lib/constants";

export function AssetCombobox({ value, onChange }: { value: string | null; onChange: (assetId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: assets = [] } = useAssets();
  const createAsset = useCreateAsset();

  const selected = assets.find((a) => a.id === value);

  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState<(typeof ASSET_CLASSES)[number]>("OTHER");

  async function handleCreate() {
    if (!newSymbol.trim() || !newName.trim()) {
      toast.error("Symbol and name are required.");
      return;
    }
    try {
      const asset = await createAsset.mutateAsync({ symbol: newSymbol.toUpperCase(), name: newName, assetClass: newClass, contractSize: 1 });
      onChange(asset.id);
      toast.success(`Added ${asset.symbol} to your assets.`);
      setCreateOpen(false);
      setNewSymbol("");
      setNewName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add asset.");
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="flex items-center gap-2">
                <span className="font-medium">{selected.symbol}</span>
                <span className="text-muted-foreground">{selected.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Select asset...</span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search assets..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                <div className="px-2 py-3 text-center text-sm text-muted-foreground">No asset found.</div>
              </CommandEmpty>
              <CommandGroup>
                {assets.map((asset) => (
                  <CommandItem
                    key={asset.id}
                    value={`${asset.symbol} ${asset.name}`}
                    onSelect={() => {
                      onChange(asset.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === asset.id ? "opacity-100" : "opacity-0")} />
                    <span className="font-medium">{asset.symbol}</span>
                    <span className="ml-2 truncate text-muted-foreground">{asset.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setNewSymbol(search.toUpperCase());
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add custom asset
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add custom asset</DialogTitle>
            <DialogDescription>Add a new tradable instrument to your journal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-symbol">Symbol</Label>
              <Input id="new-symbol" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="e.g. SOLUSD" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Solana / US Dollar" />
            </div>
            <div className="space-y-1.5">
              <Label>Asset class</Label>
              <Select value={newClass} onValueChange={(v) => setNewClass(v as typeof newClass)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createAsset.isPending}>
              {createAsset.isPending ? "Adding..." : "Add asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
