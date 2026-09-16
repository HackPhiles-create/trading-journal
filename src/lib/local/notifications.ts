import { queryAll, run, toBool } from "@/lib/local/db";
import { genId, nowIso } from "@/lib/local/utils";
import { getOrCreateLocalPreference } from "@/lib/local/preferences";
import { detectRepeatedMistakesLocal, detectSetupLossStreaksLocal } from "@/lib/local/mistake-patterns";
import type { NotificationDTO } from "@/hooks/use-notifications";

function mapNotification(row: Record<string, unknown>): NotificationDTO {
  return {
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string,
    isRead: toBool(row.isRead),
    relatedEntityId: (row.relatedEntityId as string) ?? null,
    createdAt: row.createdAt as string,
  };
}

export async function listNotifications(): Promise<NotificationDTO[]> {
  const rows = await queryAll("SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 50");
  return rows.map(mapNotification);
}

export async function markNotificationRead(id: string, isRead: boolean): Promise<NotificationDTO> {
  await run("UPDATE notifications SET isRead = ? WHERE id = ?", [isRead ? 1 : 0, id]);
  const row = await queryAll("SELECT * FROM notifications WHERE id = ?", [id]);
  return mapNotification(row[0]);
}

export async function markAllNotificationsRead(): Promise<void> {
  await run("UPDATE notifications SET isRead = 1 WHERE isRead = 0");
}

export async function createNotification(type: string, title: string, body: string, relatedEntityId: string): Promise<void> {
  await run("INSERT INTO notifications (id, type, title, body, isRead, relatedEntityId, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?)", [
    genId(),
    type,
    title,
    body,
    relatedEntityId,
    nowIso(),
  ]);
}

async function hasRecentUnread(type: string, relatedEntityId: string, sinceHours = 24): Promise<boolean> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const rows = await queryAll("SELECT id FROM notifications WHERE type = ? AND relatedEntityId = ? AND isRead = 0 AND createdAt >= ?", [
    type,
    relatedEntityId,
    since,
  ]);
  return rows.length > 0;
}

// Local port of lib/notifications/generate.ts — same rules, reading from the
// on-device mistake-pattern detectors instead of Prisma.
export async function generatePostTradeNotificationsLocal(opts: { accountId: string }): Promise<void> {
  const prefs = await getOrCreateLocalPreference();
  if (!prefs.autoDetectMistakes) return;

  if (prefs.notifyRepeatedMistake) {
    const insights = await detectRepeatedMistakesLocal({
      accountId: opts.accountId,
      windowDays: prefs.mistakeWindowDays,
      minOccurrences: prefs.mistakeMinOccurrences,
    });
    for (const insight of insights) {
      if (await hasRecentUnread("REPEATED_MISTAKE", insight.mistakeId)) continue;
      await createNotification(
        "REPEATED_MISTAKE",
        "Repeated mistake detected",
        `You've recorded "${insight.label}" ${insight.occurrences} times in the last ${insight.windowDays} days. ${insight.lossCount} of these trades resulted in losses.`,
        insight.mistakeId
      );
    }
  }

  if (prefs.notifyMultipleLosses) {
    const streaks = await detectSetupLossStreaksLocal({ accountId: opts.accountId });
    for (const streak of streaks) {
      if (await hasRecentUnread("MULTIPLE_LOSSES_SAME_SETUP", streak.strategyId)) continue;
      await createNotification(
        "MULTIPLE_LOSSES_SAME_SETUP",
        "Multiple losses from the same setup",
        `Your "${streak.strategyName}" setup has ${streak.consecutiveLosses} consecutive losses. Consider reviewing this setup before taking it again.`,
        streak.strategyId
      );
    }
  }
}

export async function notifyLowRRLocal(opts: { tradeId: string; rrRatio: number; preferredMinRR: number }): Promise<void> {
  const prefs = await getOrCreateLocalPreference();
  if (!prefs.notifyLowRR) return;
  if (await hasRecentUnread("LOW_RR", opts.tradeId)) return;
  await createNotification(
    "LOW_RR",
    "R:R below your preferred threshold",
    `This trade's R:R (1:${opts.rrRatio.toFixed(2)}) is below your preferred minimum of 1:${opts.preferredMinRR}.`,
    opts.tradeId
  );
}
