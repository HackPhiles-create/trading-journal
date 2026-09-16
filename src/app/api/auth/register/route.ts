import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

const registerSchema = z.object({
  tradeId: z
    .string()
    .trim()
    .min(3, "Trade ID must be at least 3 characters.")
    .max(32, "Trade ID must be 32 characters or fewer.")
    .regex(/^[A-Za-z0-9_.-]+$/, "Trade ID can only contain letters, numbers, _ . -"),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
});

// Only creates an account when none exists yet — this app supports exactly
// one trader profile per install, set up on first run.
export async function POST(request: Request) {
  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json({ error: "An account already exists. Please sign in instead." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({ data: { tradeId: parsed.data.tradeId, passwordHash } });

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
