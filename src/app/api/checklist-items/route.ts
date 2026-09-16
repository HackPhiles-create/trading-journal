import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createChecklistItemSchema } from "@/lib/schemas/asset";

export async function GET() {
  const items = await prisma.checklistItem.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createChecklistItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const existing = await prisma.checklistItem.findUnique({ where: { label: parsed.data.label } });
  if (existing) return NextResponse.json({ error: `Checklist item "${parsed.data.label}" already exists.` }, { status: 409 });
  const item = await prisma.checklistItem.create({ data: { ...parsed.data, isPreset: false } });
  return NextResponse.json(item, { status: 201 });
}
