"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FileSearch } from "lucide-react";
import { useTrade } from "@/hooks/use-trades";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeDetailHeader } from "@/components/trade-detail/trade-detail-header";
import { ReasoningPanel } from "@/components/trade-detail/reasoning-panel";
import { ReviewPanel } from "@/components/trade-detail/review-panel";
import { ScreenshotGallery } from "@/components/trade-detail/screenshot-gallery";
import { CloseTradeDialog } from "@/components/trade-detail/close-trade-dialog";

export function TradeDetailPageClient() {
  // Read from the browser's current URL client-side (rather than a
  // server-passed prop) — required for the native static export, where
  // /journal/[tradeId] only ever pre-renders one placeholder path at build
  // time and every real id is resolved after hydration via client-side
  // navigation. Works identically on the web build.
  const { tradeId } = useParams<{ tradeId: string }>();
  const { data: trade, isLoading } = useTrade(tradeId);
  const [closeOpen, setCloseOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!trade) {
    return <EmptyState icon={FileSearch} title="Trade not found" description="It may have been deleted." />;
  }

  return (
    <div className="space-y-6">
      <TradeDetailHeader trade={trade} onCloseTrade={() => setCloseOpen(true)} />
      <ReasoningPanel trade={trade} />
      <ScreenshotGallery trade={trade} />
      <ReviewPanel trade={trade} />
      <CloseTradeDialog trade={trade} open={closeOpen} onOpenChange={setCloseOpen} />
    </div>
  );
}
