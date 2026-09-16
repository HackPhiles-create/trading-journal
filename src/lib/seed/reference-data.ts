// No "server-only" marker here: this module is imported both by Next.js API
// routes and by prisma/seed.ts, which runs standalone via `tsx` (plain
// Node module resolution) rather than through the Next.js bundler, so the
// "server-only" package would throw immediately on import in that context.
import { prisma } from "@/lib/prisma";
import { PRESET_CHECKLIST_ITEMS, PRESET_MISTAKES, DEFAULT_ASSETS } from "@/lib/constants";

const DEMO_STRATEGIES = [
  { name: "Order Block", description: "Entries from unmitigated institutional order blocks." },
  { name: "Break of Structure", description: "Continuation entries after a confirmed structure break." },
  { name: "Liquidity Sweep", description: "Fade entries after a stop-hunt sweep of prior highs/lows." },
  { name: "Trend Continuation", description: "Pullback entries in the direction of the prevailing trend." },
  { name: "Reversal Setup", description: "Counter-trend entries at exhaustion / reversal zones." },
];

// Always-present reference data — preset checklist items, preset mistakes,
// and the default asset list. Idempotent: safe to call on every seed run.
export async function seedReferenceData() {
  await prisma.$transaction([
    ...PRESET_CHECKLIST_ITEMS.map((label) =>
      prisma.checklistItem.upsert({ where: { label }, update: {}, create: { label, isPreset: true } })
    ),
    ...PRESET_MISTAKES.map((label) =>
      prisma.mistake.upsert({ where: { label }, update: {}, create: { label, isPreset: true } })
    ),
    ...DEFAULT_ASSETS.map((asset) =>
      prisma.asset.upsert({ where: { symbol: asset.symbol }, update: {}, create: { ...asset, isCustom: false } })
    ),
    ...DEMO_STRATEGIES.map((s) => prisma.strategy.upsert({ where: { name: s.name }, update: {}, create: { ...s, isCustom: false } })),
  ]);
  await prisma.preference.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

export { DEMO_STRATEGIES };
