import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateAccountSchema } from "@/lib/schemas/account";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const account = await prisma.account.update({ where: { id }, data: parsed.data });
  return NextResponse.json(account);
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const tradeCount = await prisma.trade.count({ where: { accountId: id } });
  if (tradeCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete an account with ${tradeCount} trade(s). Delete or reassign its trades first.` },
      { status: 409 }
    );
  }
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
