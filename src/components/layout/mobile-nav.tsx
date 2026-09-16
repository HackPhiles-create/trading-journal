"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_PRIMARY_NAV_ITEMS, MOBILE_MORE_NAV_ITEMS } from "@/components/layout/nav-items";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = MOBILE_MORE_NAV_ITEMS.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border/80 bg-background/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium whitespace-nowrap transition-colors active:scale-90",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200", isActive && "scale-110")} strokeWidth={isActive ? 2.25 : 1.9} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium whitespace-nowrap transition-colors active:scale-90",
            isMoreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <MoreHorizontal className={cn("h-5 w-5 shrink-0 transition-transform duration-200", isMoreActive && "scale-110")} strokeWidth={isMoreActive ? 2.25 : 1.9} />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="lg:hidden">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div
            className="stagger-in grid grid-cols-3 gap-2 px-4"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {MOBILE_MORE_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex animate-in fade-in zoom-in-95 flex-col items-center gap-2 rounded-2xl border border-border py-4 text-xs font-medium transition-all duration-300 ease-out active:scale-95",
                    isActive ? "border-primary/30 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.9} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
