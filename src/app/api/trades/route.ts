import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTradeSchema } from "@/lib/schemas/trade";
import { validateTrade } from "@/lib/validation";
import { calculateRR } from "@/lib/trading-math";
import { getOrCreatePreference } from "@/lib/preferences";
import { notifyLowRR } from "@/lib/notifications/generate";
import type { Direction } from "@/lib/constants";

const tradeInclude = {
  account: true,
  asset: true,
  strategy: true,
  mistakes: { include: { mistake: true } },
  checklistAnswers: { include: { checklistItem: true } },
  screenshots: true,
} as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const accountId = searchParams.get("accountId") ?? undefined;
  const assetId = searchParams.get("assetId") ?? undefined;
  const strategyId = searchParams.get("strategyId") ?? undefined;
  const direction = searchParams.get("direction") ?? undefined;
  const result = searchParams.get("result") ?? undefined;
  const session = searchParams.get("session") ?? undefined;
  const mistakeId = searchParams.get("mistakeId") ?? undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const trades = await prisma.trade.findMany({
    where: {
      ...(accountId ? { accountId } : {}),
      ...(assetId ? { assetId } : {}),
      ...(strategyId ? { strategyId } : {}),
      ...(direction ? { direction } : {}),
      ...(result ? { result } : {}),
      ...(session ? { session } : {}),
      ...(mistakeId ? { mistakes: { some: { mistakeId } } } : {}),
      ...(dateFrom || dateTo
        ? {
            entryDateTime: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    },
    include: tradeInclude,
    orderBy: { entryDateTime: "desc" },
  });

  return NextResponse.json(trades);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  const [asset, account, existingTrades, prefs] = await Promise.all([
    prisma.asset.findUnique({ where: { id: input.assetId } }),
    prisma.account.findUnique({ where: { id: input.accountId } }),
    prisma.trade.findMany({
      where: { accountId: input.accountId, assetId: input.assetId },
      select: { id: true, accountId: true, assetId: true, direction: true, entryPrice: true, entryDateTime: true },
    }),
    getOrCreatePreference(),
  ]);

  if (!asset) return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const validation = validateTrade({
    direction: input.direction,
    entryPrice: input.entryPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    lotSize: input.lotSize,
    entryDateTime: input.entryDateTime,
    assetId: input.assetId,
    accountId: input.accountId,
    preferredMinRR: prefs.preferredMinRR,
    existingTrades: existingTrades.map((t) => ({
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

  // Warnings never block — they're surfaced in the response but the trade
  // still saves; only `errors` (checked above) prevent saving.

  const trade = await prisma.trade.create({
    data: {
      accountId: input.accountId,
      assetId: input.assetId,
      strategyId: input.strategyId || null,
      direction: input.direction,
      session: input.session || null,
      entryDateTime: input.entryDateTime,
      entryPrice: input.entryPrice,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      lotSize: input.lotSize,
      riskPercent: input.riskPercent ?? null,
      reasoningText: input.reasoningText || null,
      marketCondition: input.marketCondition || null,
      confirmation: input.confirmation || null,
      entryReason: input.entryReason || null,
      confluence: input.confluence || null,
      riskReasoning: input.riskReasoning || null,
      checklistAnswers: {
        create: input.checklistAnswers.map((a) => ({ checklistItemId: a.checklistItemId, checked: a.checked })),
      },
    },
    include: tradeInclude,
  });

  const rr = calculateRR({
    direction: input.direction,
    entry: input.entryPrice,
    sl: input.stopLoss,
    tp: input.takeProfit,
    lotSize: input.lotSize,
    contractSize: asset.contractSize,
  });
  if (rr.rrRatio != null && rr.rrRatio < prefs.preferredMinRR) {
    await notifyLowRR({ tradeId: trade.id, rrRatio: rr.rrRatio, preferredMinRR: prefs.preferredMinRR });
  }

  return NextResponse.json({ trade, warnings: validation.warnings }, { status: 201 });
}
