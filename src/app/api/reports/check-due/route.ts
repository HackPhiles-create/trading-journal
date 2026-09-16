import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildWeeklyReport, buildMonthlyReport, persistReport } from "@/lib/analytics/reports";
import { previousWeekRange, previousMonthRange } from "@/lib/dates";
import { getOrCreatePreference } from "@/lib/preferences";

// No real cron in a local Next.js app — this "check on load" pattern
// substitutes for a background job. Called once per app session from the
// layout. Self-healing: checks the last fully-completed week/month rather
// than "is today Monday", so a missed session doesn't skip a report.
export async function GET() {
  const prefs = await getOrCreatePreference();
  const created: string[] = [];

  const weekRange = previousWeekRange();
  const existingWeekly = await prisma.report.findFirst({
    where: { type: "WEEKLY", accountId: null, periodStart: weekRange.start },
  });
  if (!existingWeekly) {
    const tradeCount = await prisma.trade.count({
      where: { entryDateTime: { gte: weekRange.start, lte: weekRange.end } },
    });
    if (tradeCount > 0) {
      const snapshot = await buildWeeklyReport({ accountId: null, periodStart: weekRange.start, periodEnd: weekRange.end });
      const report = await persistReport(snapshot);
      if (prefs.notifyWeeklyReport) {
        await prisma.notification.create({
          data: {
            type: "WEEKLY_REPORT_READY",
            title: "Weekly report ready",
            body: `Your trading report for the week of ${weekRange.start.toLocaleDateString()} is ready to view.`,
            relatedEntityId: report.id,
          },
        });
      }
      created.push("WEEKLY");
    }
  }

  const monthRange = previousMonthRange();
  const existingMonthly = await prisma.report.findFirst({
    where: { type: "MONTHLY", accountId: null, periodStart: monthRange.start },
  });
  if (!existingMonthly) {
    const tradeCount = await prisma.trade.count({
      where: { entryDateTime: { gte: monthRange.start, lte: monthRange.end } },
    });
    if (tradeCount > 0) {
      const snapshot = await buildMonthlyReport({ accountId: null, periodStart: monthRange.start, periodEnd: monthRange.end });
      const report = await persistReport(snapshot);
      if (prefs.notifyMonthlyReport) {
        await prisma.notification.create({
          data: {
            type: "MONTHLY_REPORT_READY",
            title: "Monthly report ready",
            body: `Your trading report for ${monthRange.start.toLocaleDateString("en-US", { month: "long", year: "numeric" })} is ready to view.`,
            relatedEntityId: report.id,
          },
        });
      }
      created.push("MONTHLY");
    }
  }

  return NextResponse.json({ created });
}
