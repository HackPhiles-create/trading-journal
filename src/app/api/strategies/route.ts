import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStrategySchema } from "@/lib/schemas/asset";

export async function GET() {
  const strategies = await prisma.strategy.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(strategies);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createStrategySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const existing = await prisma.strategy.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: `Strategy "${parsed.data.name}" already exists.` }, { status: 409 });
  const strategy = await prisma.strategy.create({ data: { ...parsed.data, isCustom: true } });
  return NextResponse.json(strategy, { status: 201 });
}
