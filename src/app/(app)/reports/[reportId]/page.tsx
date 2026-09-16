import { ReportDetailPageClient } from "@/components/reports/report-detail-page-client";

// See journal/[tradeId]/page.tsx's generateStaticParams comment — same
// reasoning applies here for the native static export.
export function generateStaticParams() {
  return [{ reportId: "placeholder" }];
}

export default function ReportDetailPage() {
  return <ReportDetailPageClient />;
}
