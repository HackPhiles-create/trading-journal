import "server-only";
import { prisma } from "@/lib/prisma";

// Preference is a singleton row (id: "default"). Fetch-or-create keeps every
// caller simple without a separate migration-time seed of this one row.
export async function getOrCreatePreference() {
  const existing = await prisma.preference.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.preference.create({ data: { id: "default" } });
}
