"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSearch } from "lucide-react";
import { useTrade } from "@/hooks/use-trades";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeDetailHeader } from "@/components/trade-detail/trade-detail-header";
import { ReasoningPanel } from "@/components/trade-detail/reasoning-panel";
import { ReviewPanel } from "@/components/trade-detail/review-panel";
import { ScreenshotGallery } from "@/components/trade-detail/screenshot-gallery";
import { CloseTradeDialog } from "@/components/trade-detail/close-trade-dialog";

function TradeDetailContent() {
  // Read the id from a query string rather than a dynamic route segment
  // ([tradeId]) — required for the native static export, where a dynamic
  // segment only ever gets an RSC payload generated for build-time-known
  // paths. Real trade ids are created after install, so any id other than
  // the single generateStaticParams placeholder 404s on client navigation,
  // which was the actual cause of the "auto refresh, can't close a trade"
  // bug: a failed soft nav falling back to a broken hard reload. A plain
  // query string on a non-dynamic page has exactly one RSC payload
  // regardless of which id is being viewed, so there's nothing to be
  // missing. Works identically on the web build.
  const searchParams = useSearchParams();
  const tradeId = searchParams.get("tradeId") ?? "";
  const { data: trade, isLoading } = useTrade(tradeId || undefined);
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

export function TradeDetailPageClient() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full rounded-2xl" />}>
      <TradeDetailContent />
    </Suspense>
  );
}
