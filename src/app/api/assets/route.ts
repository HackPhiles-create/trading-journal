import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAssetSchema } from "@/lib/schemas/asset";

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: { symbol: "asc" } });
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const existing = await prisma.asset.findUnique({ where: { symbol: parsed.data.symbol } });
  if (existing) {
    return NextResponse.json({ error: `Asset "${parsed.data.symbol}" already exists.` }, { status: 409 });
  }
  const asset = await prisma.asset.create({ data: { ...parsed.data, isCustom: true } });
  return NextResponse.json(asset, { status: 201 });
}
