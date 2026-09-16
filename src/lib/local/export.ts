// Offline export: same render libraries the web /api/reports/export route
// uses (papaparse, SheetJS, react-pdf), just writing to the device and
// opening the native share sheet instead of streaming an HTTP response.
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { tradesToCsv } from "@/lib/export/csv";
import { tradesToWorkbookArray } from "@/lib/export/xlsx";
import { ReportDocument } from "@/lib/export/pdf-document";
import { computeEquitySeries } from "@/lib/analytics/compute";
import { listTrades } from "@/lib/local/trades";
import { buildReportSnapshotLocal } from "@/lib/local/reports";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function saveAndShare(filename: string, base64: string, mimeType: string): Promise<{ path: string }> {
  const path = `exports/${filename}`;
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache, recursive: true });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  await Share.share({ title: filename, url: uri }).catch(() => {
    // Share sheet dismissed/unavailable — the file is still saved on-device.
  });
  void mimeType;
  return { path };
}

export async function exportReportLocal(opts: {
  format: "pdf" | "csv" | "xlsx";
  accountId?: string | null;
  dateFrom: string;
  dateTo: string;
}): Promise<{ path: string }> {
  const periodStart = new Date(opts.dateFrom);
  const periodEnd = new Date(opts.dateTo);
  const isMonthly = periodEnd.getTime() - periodStart.getTime() > 35 * 24 * 60 * 60 * 1000;
  const fileStamp = `${opts.dateFrom}_to_${opts.dateTo}`;

  const trades = await listTrades({
    accountId: opts.accountId ?? undefined,
    dateFrom: opts.dateFrom,
    dateTo: opts.dateTo,
  });

  if (opts.format === "csv") {
    const csv = tradesToCsv(trades);
    return saveAndShare(`trades_${fileStamp}.csv`, btoa(unescape(encodeURIComponent(csv))), "text/csv");
  }

  const snapshot = await buildReportSnapshotLocal({
    type: isMonthly ? "MONTHLY" : "WEEKLY",
    accountId: opts.accountId,
    periodStart,
    periodEnd,
  });

  if (opts.format === "xlsx") {
    const bytes = tradesToWorkbookArray(trades, snapshot);
    return saveAndShare(`report_${fileStamp}.xlsx`, bytesToBase64(bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }

  // pdf
  const equityPoints = computeEquitySeries(trades).map((p) => p.equity);
  // react-pdf's `pdf()` typings expect a <Document> element specifically;
  // ReportDocument renders one internally but isn't typed as one itself.
  const element = React.createElement(ReportDocument, {
    report: snapshot,
    equityPoints: equityPoints.length ? equityPoints : [0, 0],
    trades,
  }) as unknown as Parameters<typeof pdf>[0];
  const blob = await pdf(element).toBlob();
  const base64 = await blobToBase64(blob);
  return saveAndShare(`report_${fileStamp}.pdf`, base64, "application/pdf");
}
