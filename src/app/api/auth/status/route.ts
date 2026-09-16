import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lets the login page decide whether to show "create your account" (first
// run, no User rows yet) or "sign in" (an account already exists).
export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ hasAccount: count > 0 });
}
