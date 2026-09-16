import "server-only";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { getCalendar } from "@/lib/news/forex-factory";
import { getOrCreatePreference } from "@/lib/preferences";

// "Morning" is a fixed local wall-clock window, not a fraction of the day —
// keeps the digest from firing at 2am just because it's technically "today".
const MORNING_WINDOW_START_HOUR = 6;
const MORNING_WINDOW_END_HOUR = 11;

async function hasRecentNotification(type: string, relatedEntityId: string, sinceHours: number) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: { type, relatedEntityId, createdAt: { gte: since } },
  });
  return existing != null;
}

// An event is "covered" once any merged NEWS_UPCOMING notification created in
// the lookback window mentions its id in relatedEntityId (a comma-joined list
// — see the merge step below), so re-checking every 5 minutes never re-alerts
// an event already surfaced.
async function isEventCovered(eventId: string, sinceHours: number) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: { type: "NEWS_UPCOMING", relatedEntityId: { contains: eventId }, createdAt: { gte: since } },
  });
  return existing != null;
}

function parseWatchedCurrencies(raw: string): string[] {
  return Array.from(new Set(raw.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)));
}

// Called periodically from the client (see PeriodicChecks) — there is no
// background scheduler in a locally-run Next.js app, so this only actually
// runs while someone has the app open. Never throws: a feed outage or a
// disabled preference just means zero alerts this pass.
export async function checkNewsAlerts(): Promise<string[]> {
  const prefs = await getOrCreatePreference();
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
      await prisma.notification.create({
        data: {
          type: "NEWS_MORNING",
          title: `${watchedLabel} high-impact news today`,
          body: `${todaysEvents.length} high-impact event${todaysEvents.length > 1 ? "s" : ""} today: ${list}. Trade carefully around these times.`,
          relatedEntityId: morningId,
        },
      });
      created.push("NEWS_MORNING");
    }
  }

  // Merge every event that's newly due into ONE notification instead of
  // spamming one per event — important once two currencies (USD + JPY) can
  // both have events land in the same alert window.
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
    const list = uncovered
      .map((e) => `${e.country} ${e.title} at ${formatInTimeZone(e.date, prefs.timezone, "h:mm a zzz")}`)
      .join("; ");

    await prisma.notification.create({
      data: {
        type: "NEWS_UPCOMING",
        title:
          uncovered.length > 1
            ? `${mergedCurrencies} high-impact news in ${prefs.newsAlertHoursBefore}h`
            : `${uncovered[0].country} news in ${prefs.newsAlertHoursBefore}h`,
        body: `${uncovered.length > 1 ? `${uncovered.length} high-impact events release` : "Releases"} soon: ${list}. Consider avoiding new positions until after the release${uncovered.length > 1 ? "s" : ""}.`,
        relatedEntityId: mergedId,
      },
    });
    created.push("NEWS_UPCOMING");
  }

  return created;
}
