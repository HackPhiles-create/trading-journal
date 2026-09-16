import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const tradeCount = await prisma.trade.count({ where: { assetId: id } });
  if (tradeCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete an asset used by ${tradeCount} trade(s).` },
      { status: 409 }
    );
  }
  await prisma.asset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
