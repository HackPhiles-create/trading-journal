import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";

export interface NewsEventDTO {
  id: string;
  title: string;
  country: string;
  date: string;
  impact: "Low" | "Medium" | "High";
  forecast: string;
  previous: string;
}

export function useNewsCalendar(filters?: { country?: string; impact?: string }) {
  const params = new URLSearchParams();
  if (filters?.country) params.set("country", filters.country);
  if (filters?.impact) params.set("impact", filters.impact);
  const qs = params.toString();

  return useQuery({
    queryKey: ["news", "calendar", filters],
    queryFn: () => fetchJson<NewsEventDTO[]>(`/api/news/calendar${qs ? `?${qs}` : ""}`),
    staleTime: 5 * 60_000,
  });
}
