import "server-only";

// ForexFactory's own calendar widget is backed by this JSON feed (no
// official public API exists) — same data ForexFactory.com renders,
// confirmed structurally stable: title/country/date/impact/forecast/previous.
const CALENDAR_FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

export const NEWS_IMPACTS = ["Low", "Medium", "High"] as const;
export type NewsImpact = (typeof NEWS_IMPACTS)[number];

export interface NewsEvent {
  id: string; // stable within a feed refresh — derived from title+country+date
  title: string;
  country: string; // currency code, e.g. "USD", "EUR", "All"
  date: Date;
  impact: NewsImpact;
  forecast: string;
  previous: string;
}

interface RawFeedEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

let cache: { fetchedAt: number; events: NewsEvent[] } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes — a personal journal doesn't need fresher than this

function toEventId(raw: RawFeedEvent): string {
  return `${raw.country}-${raw.date}-${raw.title}`;
}

function normalizeImpact(raw: string): NewsImpact {
  return (NEWS_IMPACTS as readonly string[]).includes(raw) ? (raw as NewsImpact) : "Low";
}

async function fetchFresh(): Promise<NewsEvent[]> {
  const res = await fetch(CALENDAR_FEED_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; TradingJournal/1.0)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Calendar feed responded with ${res.status}`);
  const raw = (await res.json()) as RawFeedEvent[];
  return raw.map((e) => ({
    id: toEventId(e),
    title: e.title,
    country: e.country,
    date: new Date(e.date),
    impact: normalizeImpact(e.impact),
    forecast: e.forecast ?? "",
    previous: e.previous ?? "",
  }));
}

// Never throws — a down/blocked external feed degrades to "no news data"
// rather than breaking the dashboard or notification checks.
export async function getCalendar(): Promise<NewsEvent[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.events;
  }
  try {
    const events = await fetchFresh();
    cache = { fetchedAt: Date.now(), events };
    return events;
  } catch (err) {
    console.error("Failed to fetch economic calendar:", err);
    return cache?.events ?? [];
  }
}
