import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMistakeSchema } from "@/lib/schemas/asset";

export async function GET() {
  const mistakes = await prisma.mistake.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json(mistakes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createMistakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const existing = await prisma.mistake.findUnique({ where: { label: parsed.data.label } });
  if (existing) return NextResponse.json({ error: `Mistake "${parsed.data.label}" already exists.` }, { status: 409 });
  const mistake = await prisma.mistake.create({ data: { ...parsed.data, isPreset: false } });
  return NextResponse.json(mistake, { status: 201 });
}
