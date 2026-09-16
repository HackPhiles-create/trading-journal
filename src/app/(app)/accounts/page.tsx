"use client";

import { useState } from "react";
import { Plus, Wallet, Trash2 } from "lucide-react";
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
import { useAccounts, useCreateAccount, useDeleteAccount, type AccountDTO } from "@/hooks/use-accounts";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AccountDTO | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("PERSONAL");
  const [broker, setBroker] = useState("");
  const [startingBalance, setStartingBalance] = useState("");

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Account name is required.");
      return;
    }
    try {
      await createAccount.mutateAsync({
        name: name.trim(),
        type,
        broker: broker || null,
        currency: "USD",
        startingBalance: startingBalance ? Number(startingBalance) : null,
      });
      toast.success("Account created.");
      setOpen(false);
      setName("");
      setBroker("");
      setStartingBalance("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account.");
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteAccount.mutateAsync(pendingDelete.id);
      toast.success("Account deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your trading accounts.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} columns={4} />
      ) : accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts yet" description="Add your first trading account to start journaling." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{a.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{a.type.replace("_", " ")}</Badge>
                      {a.isDemo && a.type !== "DEMO" && <Badge variant="secondary" className="text-[10px]">DEMO</Badge>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-loss" onClick={() => setPendingDelete(a)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                {a.broker && <p>Broker: {a.broker}</p>}
                {a.startingBalance != null && <p>Starting balance: {formatCurrency(a.startingBalance)}</p>}
                <p>Currency: {a.currency}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add account</DialogTitle>
            <DialogDescription>Create a new trading account to journal against.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Name</Label>
              <Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Personal Account" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-broker">Broker (optional)</Label>
              <Input id="account-broker" value={broker} onChange={(e) => setBroker(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-balance">Starting balance (optional)</Label>
              <Input id="account-balance" inputMode="decimal" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} placeholder="10000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createAccount.isPending}>{createAccount.isPending ? "Creating..." : "Create account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="Accounts with trades attached cannot be deleted. This cannot be undone."
        confirmLabel="Delete Account"
        onConfirm={handleDelete}
      />
    </div>
  );
}
