import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeTradeSchema } from "@/lib/schemas/trade";
import { generatePostTradeNotifications } from "@/lib/notifications/generate";

const tradeInclude = {
  account: true,
  asset: true,
  strategy: true,
  mistakes: { include: { mistake: true } },
  checklistAnswers: { include: { checklistItem: true } },
  screenshots: true,
} as const;

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = closeTradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await prisma.trade.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Trade not found." }, { status: 404 });

  if (input.exitDateTime.getTime() < existing.entryDateTime.getTime()) {
    return NextResponse.json({ error: "Exit date/time cannot be before the entry date/time." }, { status: 422 });
  }

  await prisma.trade.update({
    where: { id },
    data: {
      status: "CLOSED",
      exitPrice: input.exitPrice,
      exitDateTime: input.exitDateTime,
      result: input.result,
      actualPnl: input.actualPnl,
      actualRMultiple: input.actualRMultiple ?? null,
      pnlManuallyOverridden: input.pnlManuallyOverridden,
      emotionalState: input.emotionalState || null,
      whatWentWell: input.whatWentWell || null,
      whatToImprove: input.whatToImprove || null,
      lessonLearned: input.lessonLearned || null,
      mistakes: {
        deleteMany: {},
        create: input.mistakes.map((m) => ({ mistakeId: m.mistakeId, note: m.note || null })),
      },
    },
  });

  await generatePostTradeNotifications({ accountId: existing.accountId });

  const trade = await prisma.trade.findUnique({ where: { id }, include: tradeInclude });
  return NextResponse.json(trade);
}
