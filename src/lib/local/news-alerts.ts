// Local-SQLite port of lib/news/alerts.ts — identical rules/merge logic;
// only the notification storage moves from Prisma to local SQLite. The
// calendar fetch itself (getCalendar) is already shared/portable — see
// lib/news/forex-factory.ts's header comment.
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { queryAll } from "@/lib/local/db";
import { getCalendar } from "@/lib/news/forex-factory";
import { getOrCreateLocalPreference } from "@/lib/local/preferences";
import { createNotification } from "@/lib/local/notifications";

const MORNING_WINDOW_START_HOUR = 6;
const MORNING_WINDOW_END_HOUR = 11;

async function hasRecentNotification(type: string, relatedEntityId: string, sinceHours: number): Promise<boolean> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const rows = await queryAll("SELECT id FROM notifications WHERE type = ? AND relatedEntityId = ? AND createdAt >= ?", [type, relatedEntityId, since]);
  return rows.length > 0;
}

async function isEventCovered(eventId: string, sinceHours: number): Promise<boolean> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const rows = await queryAll("SELECT id FROM notifications WHERE type = 'NEWS_UPCOMING' AND relatedEntityId LIKE ? AND createdAt >= ?", [
    `%${eventId}%`,
    since,
  ]);
  return rows.length > 0;
}

function parseWatchedCurrencies(raw: string): string[] {
  return Array.from(new Set(raw.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)));
}

export async function checkNewsAlertsLocal(): Promise<string[]> {
  const prefs = await getOrCreateLocalPreference();
  const created: string[] = [];
  if (!prefs.newsAlertsEnabled) return created;

  const currencies = parseWatchedCurrencies(prefs.newsAlertCurrency);
  if (currencies.length === 0) return created;

  const events = await getCalendar();
  const watched = events.filter((e) => currencies.includes(e.country) && e.impact === "High");
  if (watched.length === 0) return created;

  const now = new Date();
  const zonedNow = toZonedTime(now, prefs.timezone);
  const todayKey = formatInTimeZone(now, prefs.timezone, "yyyy-MM-dd");
  const todaysEvents = watched.filter((e) => formatInTimeZone(e.date, prefs.timezone, "yyyy-MM-dd") === todayKey);
  const watchedLabel = currencies.join("/");

  const hour = zonedNow.getHours();
  if (todaysEvents.length > 0 && hour >= MORNING_WINDOW_START_HOUR && hour < MORNING_WINDOW_END_HOUR) {
    const morningId = `morning-${todayKey}-${currencies.join("-")}`;
    if (!(await hasRecentNotification("NEWS_MORNING", morningId, 20))) {
      const list = todaysEvents.map((e) => `${e.country} ${e.title} at ${formatInTimeZone(e.date, prefs.timezone, "h:mm a")}`).join("; ");
      await createNotification(
        "NEWS_MORNING",
        `${watchedLabel} high-impact news today`,
        `${todaysEvents.length} high-impact event${todaysEvents.length > 1 ? "s" : ""} today: ${list}. Trade carefully around these times.`,
        morningId
      );
      created.push("NEWS_MORNING");
    }
  }

  const windowMs = prefs.newsAlertHoursBefore * 60 * 60 * 1000;
  const dueSoon = watched.filter((e) => {
    const msUntil = e.date.getTime() - now.getTime();
    return msUntil > 0 && msUntil <= windowMs;
  });

  const uncovered = [];
  for (const event of dueSoon) {
    if (!(await isEventCovered(event.id, prefs.newsAlertHoursBefore + 1))) uncovered.push(event);
  }

  if (uncovered.length > 0) {
    uncovered.sort((a, b) => a.date.getTime() - b.date.getTime());
    const mergedId = uncovered.map((e) => e.id).join(",");
    const mergedCurrencies = Array.from(new Set(uncovered.map((e) => e.country))).join("/");
    const list = uncovered.map((e) => `${e.country} ${e.title} at ${formatInTimeZone(e.date, prefs.timezone, "h:mm a zzz")}`).join("; ");

    await createNotification(
      "NEWS_UPCOMING",
      uncovered.length > 1 ? `${mergedCurrencies} high-impact news in ${prefs.newsAlertHoursBefore}h` : `${uncovered[0].country} news in ${prefs.newsAlertHoursBefore}h`,
      `${uncovered.length > 1 ? `${uncovered.length} high-impact events release` : "Releases"} soon: ${list}. Consider avoiding new positions until after the release${uncovered.length > 1 ? "s" : ""}.`,
      mergedId
    );
    created.push("NEWS_UPCOMING");
  }

  return created;
}
