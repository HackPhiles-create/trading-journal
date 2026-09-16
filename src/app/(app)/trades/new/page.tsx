"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { TradeForm } from "@/components/trade-form/trade-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";

export default function NewTradePage() {
  const { data: accounts = [], isLoading } = useAccounts();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Trade</h1>
        <p className="text-sm text-muted-foreground">Log a new trade with live R:R calculation.</p>
      </div>
      {!isLoading && accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Create an account first"
          description="You need at least one trading account before you can log a trade."
          action={
            <Button asChild size="sm">
              <Link href="/accounts">Add Account</Link>
            </Button>
          }
        />
      ) : (
        <TradeForm />
      )}
    </div>
  );
}
