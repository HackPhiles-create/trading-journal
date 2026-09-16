"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAccounts } from "@/hooks/use-accounts";

export function Sidebar() {
  const pathname = usePathname();
  const { data: accounts = [] } = useAccounts();
  const hasDemoData = accounts.some((a) => a.isDemo);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.25} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Trading Journal</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-sidebar-primary")} strokeWidth={2} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <p className="text-[11px] leading-tight text-sidebar-foreground/50">
          {hasDemoData ? (
            <>
              Demo data included.
              <br />
              Reset anytime in Settings.
            </>
          ) : accounts.length === 0 ? (
            <>
              No accounts yet.
              <br />
              Add one to get started.
            </>
          ) : (
            "Your live trading journal."
          )}
        </p>
      </div>
    </aside>
  );
}
