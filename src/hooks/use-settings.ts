import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";

export interface PreferenceDTO {
  id: string;
  theme: string;
  timezone: string;
  defaultAccountId: string | null;
  preferredMinRR: number;
  notifyWeeklyReport: boolean;
  notifyMonthlyReport: boolean;
  notifyRepeatedMistake: boolean;
  notifyMultipleLosses: boolean;
  notifyLowRR: boolean;
  notifyNewStats: boolean;
  soundEnabled: boolean;
  soundOnClick: boolean;
  autoDetectMistakes: boolean;
  mistakeWindowDays: number;
  mistakeMinOccurrences: number;
  newsAlertsEnabled: boolean;
  newsAlertCurrency: string;
  newsAlertHoursBefore: number;
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings(), queryFn: () => fetchJson<PreferenceDTO>("/api/settings") });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PreferenceDTO>) =>
      fetchJson<PreferenceDTO>("/api/settings", { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings() }),
  });
}

export function useResetDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson<{ ok: true }>("/api/seed/reset-demo", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useClearDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson<{ ok: true }>("/api/seed/reset-demo", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}
