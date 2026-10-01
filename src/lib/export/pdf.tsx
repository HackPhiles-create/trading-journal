import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument, toReportDocTrade } from "@/lib/export/pdf-document";
import { readUploadAsDataUri } from "@/lib/uploads";
import type { ReportSnapshot } from "@/lib/analytics/reports";
import type { TradeWithRelations } from "@/lib/analytics/aggregate";

export { ReportDocument };

export async function renderReportPdf(opts: {
  report: ReportSnapshot;
  equityPoints: number[];
  trades: TradeWithRelations[];
}): Promise<Buffer> {
  const filePaths = Array.from(new Set(opts.trades.flatMap((t) => t.screenshots.map((s) => s.filePath))));
  const dataUris = new Map<string, string>();
  await Promise.all(
    filePaths.map(async (filePath) => {
      const dataUri = await readUploadAsDataUri(filePath);
      if (dataUri) dataUris.set(filePath, dataUri);
    })
  );
  const trades = opts.trades.map((t) => toReportDocTrade(t, dataUris));
  return renderToBuffer(<ReportDocument report={opts.report} equityPoints={opts.equityPoints} trades={trades} />);
}
