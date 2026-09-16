import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreatePreference } from "@/lib/preferences";

export async function GET() {
  const prefs = await getOrCreatePreference();
  return NextResponse.json(prefs);
}

const updateSchema = z.object({
  theme: z.string().optional(),
  timezone: z.string().optional(),
  defaultAccountId: z.string().nullable().optional(),
  preferredMinRR: z.coerce.number().positive().optional(),
  notifyWeeklyReport: z.boolean().optional(),
  notifyMonthlyReport: z.boolean().optional(),
  notifyRepeatedMistake: z.boolean().optional(),
  notifyMultipleLosses: z.boolean().optional(),
  notifyLowRR: z.boolean().optional(),
  notifyNewStats: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  soundOnClick: z.boolean().optional(),
  autoDetectMistakes: z.boolean().optional(),
  mistakeWindowDays: z.coerce.number().int().min(1).max(365).optional(),
  mistakeMinOccurrences: z.coerce.number().int().min(1).max(50).optional(),
  newsAlertsEnabled: z.boolean().optional(),
  newsAlertCurrency: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[A-Za-z]{2,10}(,[A-Za-z]{2,10})*$/, "Use comma-separated currency codes, e.g. USD,JPY")
    .optional(),
  newsAlertHoursBefore: z.coerce.number().int().min(1).max(24).optional(),
});

export async function PATCH(request: Request) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  await getOrCreatePreference();
  const prefs = await prisma.preference.update({ where: { id: "default" }, data: parsed.data });
  return NextResponse.json(prefs);
}
