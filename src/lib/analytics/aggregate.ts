import "server-only";
import { prisma } from "@/lib/prisma";
import type { Direction } from "@/lib/constants";

// The only server-only piece left here is the Prisma fetch — every actual
// computation lives in ./compute (pure, no Prisma), shared verbatim by the
// server (this file), the offline Android build (lib/local/analytics.ts),
// and reused for dashboard cards / the analytics page / reports so figures
// can never diverge between views or between online and offline builds.
export * from "./compute";

export type TradeWithRelations = Awaited<ReturnType<typeof getTradesInRange>>[number];

export interface TradeFilters {
  accountId?: string | null;
  assetId?: string | null;
  strategyId?: string | null;
  direction?: Direction | null;
  result?: string | null;
  session?: string | null;
  mistakeId?: string | null;
}

export async function getTradesInRange(opts: {
  start?: Date;
  end?: Date;
  filters?: TradeFilters;
}) {
  const { start, end, filters } = opts;

  return prisma.trade.findMany({
    where: {
      ...(start || end
        ? { entryDateTime: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } }
        : {}),
      ...(filters?.accountId ? { accountId: filters.accountId } : {}),
      ...(filters?.assetId ? { assetId: filters.assetId } : {}),
      ...(filters?.strategyId ? { strategyId: filters.strategyId } : {}),
      ...(filters?.direction ? { direction: filters.direction } : {}),
      ...(filters?.result ? { result: filters.result } : {}),
      ...(filters?.session ? { session: filters.session } : {}),
      ...(filters?.mistakeId ? { mistakes: { some: { mistakeId: filters.mistakeId } } } : {}),
    },
    include: {
      account: true,
      asset: true,
      strategy: true,
      mistakes: { include: { mistake: true } },
      checklistAnswers: { include: { checklistItem: true } },
      screenshots: true,
    },
    orderBy: { entryDateTime: "asc" },
  });
}
