import { NextResponse } from "next/server";
import { getTradesInRange, computeEquitySeries } from "@/lib/analytics/aggregate";
import { buildWeeklyReport, buildMonthlyReport } from "@/lib/analytics/reports";
import { tradesToCsv } from "@/lib/export/csv";
import { tradesToWorkbookBuffer } from "@/lib/export/xlsx";
import { renderReportPdf } from "@/lib/export/pdf";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const accountId = searchParams.get("accountId") ?? undefined;
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");

  if (!dateFromParam || !dateToParam) {
    return NextResponse.json({ error: "dateFrom and dateTo are required." }, { status: 400 });
  }

  const periodStart = new Date(dateFromParam);
  const periodEnd = new Date(dateToParam);
  const isMonthly = periodEnd.getTime() - periodStart.getTime() > 35 * 24 * 60 * 60 * 1000;

  const trades = await getTradesInRange({ start: periodStart, end: periodEnd, filters: { accountId } });
  const fileStamp = `${dateFromParam}_to_${dateToParam}`;

  if (format === "csv") {
    const csv = tradesToCsv(trades);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="trades_${fileStamp}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const report = isMonthly
      ? await buildMonthlyReport({ accountId, periodStart, periodEnd })
      : await buildWeeklyReport({ accountId, periodStart, periodEnd });
    const buffer = tradesToWorkbookBuffer(trades, report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="report_${fileStamp}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const report = isMonthly
      ? await buildMonthlyReport({ accountId, periodStart, periodEnd })
      : await buildWeeklyReport({ accountId, periodStart, periodEnd });
    const equityPoints = computeEquitySeries(trades).map((p) => p.equity);
    const buffer = await renderReportPdf({ report, equityPoints: equityPoints.length ? equityPoints : [0, 0], trades });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report_${fileStamp}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: `Unsupported format "${format}".` }, { status: 400 });
}
