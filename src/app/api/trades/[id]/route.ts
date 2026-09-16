import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTradeSchema } from "@/lib/schemas/trade";
import { validateTrade } from "@/lib/validation";
import { getOrCreatePreference } from "@/lib/preferences";
import type { Direction } from "@/lib/constants";

const tradeInclude = {
  account: true,
  asset: true,
  strategy: true,
  mistakes: { include: { mistake: true } },
  checklistAnswers: { include: { checklistItem: true } },
  screenshots: true,
} as const;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const trade = await prisma.trade.findUnique({ where: { id }, include: tradeInclude });
  if (!trade) return NextResponse.json({ error: "Trade not found." }, { status: 404 });
  return NextResponse.json(trade);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = updateTradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await prisma.trade.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Trade not found." }, { status: 404 });

  const merged = {
    direction: (input.direction ?? existing.direction) as Direction,
    entryPrice: input.entryPrice ?? existing.entryPrice,
    stopLoss: input.stopLoss ?? existing.stopLoss,
    takeProfit: input.takeProfit ?? existing.takeProfit,
    lotSize: input.lotSize ?? existing.lotSize,
    entryDateTime: input.entryDateTime ?? existing.entryDateTime,
    assetId: input.assetId ?? existing.assetId,
    accountId: input.accountId ?? existing.accountId,
  };

  const prefs = await getOrCreatePreference();
  const otherTrades = await prisma.trade.findMany({
    where: { accountId: merged.accountId, assetId: merged.assetId, id: { not: id } },
    select: { id: true, accountId: true, assetId: true, direction: true, entryPrice: true, entryDateTime: true },
  });

  const validation = validateTrade({
    ...merged,
    preferredMinRR: prefs.preferredMinRR,
    existingTrades: otherTrades.map((t) => ({
      id: t.id,
      accountId: t.accountId,
      assetId: t.assetId,
      direction: t.direction as Direction,
      entryPrice: t.entryPrice,
      entryDateTime: t.entryDateTime,
    })),
  });

  if (validation.errors.length > 0) {
    return NextResponse.json({ error: validation.errors[0].message, errors: validation.errors }, { status: 422 });
  }

  const { checklistAnswers, ...rest } = input;

  const trade = await prisma.trade.update({
    where: { id },
    data: {
      ...rest,
      ...(checklistAnswers
        ? {
            checklistAnswers: {
              deleteMany: {},
              create: checklistAnswers.map((a) => ({ checklistItemId: a.checklistItemId, checked: a.checked })),
            },
          }
        : {}),
    },
    include: tradeInclude,
  });

  return NextResponse.json(trade);
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.trade.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
