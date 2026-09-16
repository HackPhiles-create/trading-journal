import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildWeeklyReport, buildMonthlyReport, persistReport } from "@/lib/analytics/reports";
import { REPORT_TYPES } from "@/lib/constants";

export async function GET() {
  const reports = await prisma.report.findMany({
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      type: true,
      accountId: true,
      periodStart: true,
      periodEnd: true,
      totalPnl: true,
      winRate: true,
      tradeCount: true,
      generatedAt: true,
    },
  });
  return NextResponse.json(reports);
}

const generateReportSchema = z.object({
  type: z.enum(REPORT_TYPES),
  accountId: z.string().nullable().optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = generateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { type, accountId, periodStart, periodEnd } = parsed.data;

  const snapshot =
    type === "WEEKLY"
      ? await buildWeeklyReport({ accountId, periodStart, periodEnd })
      : await buildMonthlyReport({ accountId, periodStart, periodEnd });

  const report = await persistReport(snapshot);
  return NextResponse.json(report, { status: 201 });
}
