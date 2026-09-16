import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAccountSchema } from "@/lib/schemas/account";

export async function GET() {
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const account = await prisma.account.create({ data: parsed.data });
  return NextResponse.json(account, { status: 201 });
}
