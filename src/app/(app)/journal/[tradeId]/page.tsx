"use client";

import { useState } from "react";
import { use } from "react";
import { FileSearch } from "lucide-react";
import { useTrade } from "@/hooks/use-trades";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeDetailHeader } from "@/components/trade-detail/trade-detail-header";
import { ReasoningPanel } from "@/components/trade-detail/reasoning-panel";
import { ReviewPanel } from "@/components/trade-detail/review-panel";
import { ScreenshotGallery } from "@/components/trade-detail/screenshot-gallery";
import { CloseTradeDialog } from "@/components/trade-detail/close-trade-dialog";

export default function TradeDetailPage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = use(params);
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
