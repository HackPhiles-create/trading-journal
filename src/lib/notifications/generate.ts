import "server-only";
import { prisma } from "@/lib/prisma";
import { detectRepeatedMistakes, detectSetupLossStreaks } from "@/lib/analytics/mistake-patterns";
import { getOrCreatePreference } from "@/lib/preferences";

// Called after a trade is created/closed. Inserts a Notification row for any
// newly-crossed threshold, de-duplicated against existing unread
// notifications for the same type+entity so a save doesn't spam the center.

async function hasRecentUnread(type: string, relatedEntityId: string, sinceHours = 24) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: { type, relatedEntityId, isRead: false, createdAt: { gte: since } },
  });
  return existing != null;
}

export async function generatePostTradeNotifications(opts: { accountId: string }) {
  const prefs = await getOrCreatePreference();
  const created: string[] = [];

  // Master switch: automatic mistake/streak detection (Settings > Mistake
  // Detection). Off means neither the panel nor these notifications fire.
  if (!prefs.autoDetectMistakes) return created;

  if (prefs.notifyRepeatedMistake) {
    const insights = await detectRepeatedMistakes({
      accountId: opts.accountId,
      windowDays: prefs.mistakeWindowDays,
      minOccurrences: prefs.mistakeMinOccurrences,
    });
    for (const insight of insights) {
      if (await hasRecentUnread("REPEATED_MISTAKE", insight.mistakeId)) continue;
      await prisma.notification.create({
        data: {
          type: "REPEATED_MISTAKE",
          title: "Repeated mistake detected",
          body: `You've recorded "${insight.label}" ${insight.occurrences} times in the last ${insight.windowDays} days. ${insight.lossCount} of these trades resulted in losses.`,
          relatedEntityId: insight.mistakeId,
        },
      });
      created.push("REPEATED_MISTAKE");
    }
  }

  if (prefs.notifyMultipleLosses) {
    const streaks = await detectSetupLossStreaks({ accountId: opts.accountId });
    for (const streak of streaks) {
      if (await hasRecentUnread("MULTIPLE_LOSSES_SAME_SETUP", streak.strategyId)) continue;
      await prisma.notification.create({
        data: {
          type: "MULTIPLE_LOSSES_SAME_SETUP",
          title: "Multiple losses from the same setup",
          body: `Your "${streak.strategyName}" setup has ${streak.consecutiveLosses} consecutive losses. Consider reviewing this setup before taking it again.`,
          relatedEntityId: streak.strategyId,
        },
      });
      created.push("MULTIPLE_LOSSES_SAME_SETUP");
    }
  }

  return created;
}

export async function notifyLowRR(opts: { tradeId: string; rrRatio: number; preferredMinRR: number }) {
  const prefs = await getOrCreatePreference();
  if (!prefs.notifyLowRR) return;
  if (await hasRecentUnread("LOW_RR", opts.tradeId)) return;
  await prisma.notification.create({
    data: {
      type: "LOW_RR",
      title: "R:R below your preferred threshold",
      body: `This trade's R:R (1:${opts.rrRatio.toFixed(2)}) is below your preferred minimum of 1:${opts.preferredMinRR}.`,
      relatedEntityId: opts.tradeId,
    },
  });
}
