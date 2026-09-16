import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

const loginSchema = z.object({
  tradeId: z.string().trim().min(1, "Trade ID is required."),
  password: z.string().min(1, "Password is required."),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { tradeId: parsed.data.tradeId } });
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Invalid Trade ID or password." }, { status: 401 });
  }

  const token = await createSessionToken(user.id, process.env.SESSION_SECRET!);
  const res = NextResponse.json({ ok: true, tradeId: user.tradeId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
