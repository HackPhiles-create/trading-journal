import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";
import type { CreateTradeInput, CloseTradeInput } from "@/lib/schemas/trade";

export interface TradeDTO {
  id: string;
  accountId: string;
  assetId: string;
  strategyId: string | null;
  direction: string;
  status: string;
  session: string | null;
  entryDateTime: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  exitPrice: number | null;
  exitDateTime: string | null;
  result: string | null;
  actualPnl: number | null;
  actualRMultiple: number | null;
  reasoningText: string | null;
  marketCondition: string | null;
  confirmation: string | null;
  entryReason: string | null;
  confluence: string | null;
  riskReasoning: string | null;
  emotionalState: string | null;
  whatWentWell: string | null;
  whatToImprove: string | null;
  lessonLearned: string | null;
  isDemo: boolean;
  account: { id: string; name: string };
  asset: { id: string; symbol: string; name: string; contractSize: number };
  strategy: { id: string; name: string } | null;
  mistakes: { id: string; mistakeId: string; note: string | null; mistake: { id: string; label: string } }[];
  checklistAnswers: { id: string; checklistItemId: string; checked: boolean; checklistItem: { id: string; label: string } }[];
  screenshots: { id: string; filePath: string; phase: string; caption: string | null }[];
}

export interface TradeFilterQuery {
  accountId?: string;
  assetId?: string;
  strategyId?: string;
  direction?: string;
  result?: string;
  session?: string;
  mistakeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildQuery(filters?: TradeFilterQuery) {
  if (!filters) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useTrades(filters?: TradeFilterQuery) {
  return useQuery({
    queryKey: queryKeys.trades(filters),
    queryFn: () => fetchJson<TradeDTO[]>(`/api/trades${buildQuery(filters)}`),
  });
}

export function useTrade(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trade(id ?? ""),
    queryFn: () => fetchJson<TradeDTO>(`/api/trades/${id}`),
    enabled: !!id,
  });
}

export function useCreateTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTradeInput) =>
      fetchJson<{ trade: TradeDTO; warnings: { field: string; message: string }[] }>("/api/trades", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });
}

export function useUpdateTrade(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateTradeInput>) =>
      fetchJson<TradeDTO>(`/api/trades/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useCloseTrade(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CloseTradeInput) =>
      fetchJson<TradeDTO>(`/api/trades/${id}/close`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
    },
  });
}

export function useDeleteTrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<{ ok: true }>(`/api/trades/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUploadScreenshot(tradeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, phase, caption }: { file: File; phase: "BEFORE" | "AFTER"; caption?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("phase", phase);
      if (caption) formData.append("caption", caption);
      const res = await fetch(`/api/trades/${tradeId}/screenshots`, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.trade(tradeId) }),
  });
}

export function useDeleteScreenshot(tradeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (screenshotId: string) =>
      fetchJson<{ ok: true }>(`/api/trades/${tradeId}/screenshots/${screenshotId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.trade(tradeId) }),
  });
}
