import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { isNative } from "@/lib/data-source";
import { getCalendar } from "@/lib/news/forex-factory";

export interface NewsEventDTO {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: "Low" | "Medium" | "High";
  forecast: string;
  previous: string;
}

async function getCalendarLocal(filters?: { country?: string; impact?: string }): Promise<NewsEventDTO[]> {
  const events = await getCalendar();
  return events
    .filter((e) => (!filters?.country || e.country === filters.country) && (!filters?.impact || e.impact === filters.impact))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => ({ ...e, date: e.date.toISOString() }));
}

export function useNewsCalendar(filters?: { country?: string; impact?: string }) {
  const params = new URLSearchParams();
  if (filters?.country) params.set("country", filters.country);
  if (filters?.impact) params.set("impact", filters.impact);
  const qs = params.toString();

  return useQuery({
    queryKey: ["news", "calendar", filters],
    queryFn: () => (isNative() ? getCalendarLocal(filters) : fetchJson<NewsEventDTO[]>(`/api/news/calendar${qs ? `?${qs}` : ""}`)),
    staleTime: 5 * 60_000,
  });
}
