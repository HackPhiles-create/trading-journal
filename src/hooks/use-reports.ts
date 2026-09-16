import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";
import { isNative } from "@/lib/data-source";
import { listReportsLocal, getReportLocal, generateReportLocal } from "@/lib/local/reports";
import { exportReportLocal } from "@/lib/local/export";
import type { ReportType } from "@/lib/constants";

export interface ReportDTO {
  id: string;
  type: ReportType;
  accountId: string | null;
  periodStart: string;
  periodEnd: string;
  totalPnl: number;
  winRate: number;
  tradeCount: number;
  generatedAt: string;
}

export function useReports() {
  return useQuery({ queryKey: queryKeys.reports(), queryFn: () => (isNative() ? listReportsLocal() : fetchJson<ReportDTO[]>("/api/reports")) });
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.report(id ?? ""),
    queryFn: () => (isNative() ? getReportLocal(id as string) : fetchJson<ReportDTO & { data: unknown }>(`/api/reports/${id}`)),
    enabled: !!id,
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: ReportType; accountId?: string | null; periodStart: string; periodEnd: string }) =>
      isNative()
        ? generateReportLocal({ type: input.type, accountId: input.accountId, periodStart: new Date(input.periodStart), periodEnd: new Date(input.periodEnd) })
        : fetchJson<ReportDTO>("/api/reports", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reports() }),
  });
}

export function exportReportUrl(opts: { format: "pdf" | "csv" | "xlsx"; accountId?: string | null; dateFrom: string; dateTo: string }) {
  const params = new URLSearchParams({ format: opts.format, dateFrom: opts.dateFrom, dateTo: opts.dateTo });
  if (opts.accountId) params.set("accountId", opts.accountId);
  return `/api/reports/export?${params.toString()}`;
}

/** Native has no server route to stream a file from — this saves the export
 * directly to the device and returns where it went. Web keeps using
 * exportReportUrl() as a plain download link. */
export function useExportReportLocal() {
  return useMutation({
    mutationFn: (opts: { format: "pdf" | "csv" | "xlsx"; accountId?: string | null; dateFrom: string; dateTo: string }) =>
      exportReportLocal(opts),
  });
}
