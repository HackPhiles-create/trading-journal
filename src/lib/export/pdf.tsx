import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument } from "@/lib/export/pdf-document";
import type { ReportSnapshot } from "@/lib/analytics/reports";
import type { TradeWithRelations } from "@/lib/analytics/aggregate";

export { ReportDocument };

export async function renderReportPdf(opts: {
  report: ReportSnapshot;
  equityPoints: number[];
  trades: TradeWithRelations[];
}): Promise<Buffer> {
  return renderToBuffer(<ReportDocument {...opts} />);
}
