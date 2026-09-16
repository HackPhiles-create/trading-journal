"use client";

import { Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/use-accounts";
import { useFilters } from "@/hooks/use-filters";

export function AccountSwitcher() {
  const { data: accounts = [] } = useAccounts();
  const { accountId, setFilter } = useFilters();

  return (
    <Select value={accountId ?? "all"} onValueChange={(v) => setFilter("accountId", v === "all" ? null : v)}>
      <SelectTrigger className="h-9 w-[132px] rounded-full border-border bg-card text-sm shadow-none sm:w-[180px]">
        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="All Accounts" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="all">All Accounts</SelectItem>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.name}
            {account.isDemo ? " (Demo)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
