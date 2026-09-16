import { NextResponse } from "next/server";
import { clearDemoData, generateDemoTrades } from "@/lib/seed/generate-demo-data";
import { seedReferenceData } from "@/lib/seed/reference-data";

export async function POST() {
  await clearDemoData();
  await seedReferenceData();
  const result = await generateDemoTrades();
  return NextResponse.json({ ok: true, ...result });
}

// Clears demo trades/accounts without regenerating — for going "live" with
// an empty journal. Never touches real (non-demo) trades or accounts.
export async function DELETE() {
  await clearDemoData();
  return NextResponse.json({ ok: true });
}
