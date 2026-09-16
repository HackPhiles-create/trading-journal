import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  return NextResponse.json({
    id: report.id,
    type: report.type,
    accountId: report.accountId,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    totalPnl: report.totalPnl,
    winRate: report.winRate,
    tradeCount: report.tradeCount,
    generatedAt: report.generatedAt,
    data: JSON.parse(report.dataJson),
  });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.report.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
