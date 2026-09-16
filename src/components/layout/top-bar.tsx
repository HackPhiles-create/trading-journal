"use client";

import Link from "next/link";
import { PlusCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AccountSwitcher } from "@/components/layout/account-switcher";
import { NotificationCenter } from "@/components/notifications/notification-center";

export function TopBar() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-xl sm:px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)", paddingBottom: "1rem" }}
    >
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <TrendingUp className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <span className="text-sm font-semibold">Trading Journal</span>
      </div>

      <div className="hidden sm:block">
        <AccountSwitcher />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="sm:hidden">
          <AccountSwitcher />
        </div>
        <Button asChild size="sm" className="hidden gap-1.5 rounded-full sm:inline-flex">
          <Link href="/trades/new">
            <PlusCircle className="h-4 w-4" />
            Add Trade
          </Link>
        </Button>
        <NotificationCenter />
        <ThemeToggle />
      </div>
    </header>
  );
}
