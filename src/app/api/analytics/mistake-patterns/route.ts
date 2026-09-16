import { NextResponse } from "next/server";
import { detectRepeatedMistakes, detectSetupLossStreaks } from "@/lib/analytics/mistake-patterns";
import { getOrCreatePreference } from "@/lib/preferences";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId") ?? undefined;

  const prefs = await getOrCreatePreference();
  if (!prefs.autoDetectMistakes) {
    return NextResponse.json({ repeatedMistakes: [], setupLossStreaks: [], autoDetectDisabled: true });
  }

  const [repeatedMistakes, setupLossStreaks] = await Promise.all([
    detectRepeatedMistakes({ accountId, windowDays: prefs.mistakeWindowDays, minOccurrences: prefs.mistakeMinOccurrences }),
    detectSetupLossStreaks({ accountId }),
  ]);

  return NextResponse.json({ repeatedMistakes, setupLossStreaks, autoDetectDisabled: false });
}
