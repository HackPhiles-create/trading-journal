import { TradeDetailPageClient } from "@/components/trade-detail/trade-detail-page-client";

// Required for the native static export (scripts/build-native.mjs) — a
// static export must pre-render at least one path per dynamic segment, so
// this generates a single unused placeholder. The Capacitor app always
// cold-starts at "/" and reaches real trade ids only via client-side
// navigation, which TradeDetailPageClient resolves at runtime via
// useParams() rather than this build-time value. Must live in a
// (non-"use client") server component — Next rejects it in a client file.
export function generateStaticParams() {
  return [{ tradeId: "placeholder" }];
}

export default function TradeDetailPage() {
  return <TradeDetailPageClient />;
}
