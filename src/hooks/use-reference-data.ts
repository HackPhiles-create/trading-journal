import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";
import type { CreateAssetInput, CreateStrategyInput, CreateMistakeInput, CreateChecklistItemInput } from "@/lib/schemas/asset";

export interface AssetDTO {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  contractSize: number;
  isCustom: boolean;
}
export interface StrategyDTO {
  id: string;
  name: string;
  description: string | null;
  isCustom: boolean;
}
export interface MistakeDTO {
  id: string;
  label: string;
  isPreset: boolean;
}
export interface ChecklistItemDTO {
  id: string;
  label: string;
  isPreset: boolean;
}

export function useAssets() {
  return useQuery({ queryKey: queryKeys.assets(), queryFn: () => fetchJson<AssetDTO[]>("/api/assets") });
}
export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetInput) => fetchJson<AssetDTO>("/api/assets", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.assets() }),
  });
}
export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson<{ ok: true }>(`/api/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.assets() }),
  });
}

export function useStrategies() {
  return useQuery({ queryKey: queryKeys.strategies(), queryFn: () => fetchJson<StrategyDTO[]>("/api/strategies") });
}
export function useCreateStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStrategyInput) => fetchJson<StrategyDTO>("/api/strategies", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.strategies() }),
  });
}

export function useMistakes() {
  return useQuery({ queryKey: queryKeys.mistakes(), queryFn: () => fetchJson<MistakeDTO[]>("/api/mistakes") });
}
export function useCreateMistake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMistakeInput) => fetchJson<MistakeDTO>("/api/mistakes", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.mistakes() }),
  });
}

export function useChecklistItems() {
  return useQuery({
    queryKey: queryKeys.checklistItems(),
    queryFn: () => fetchJson<ChecklistItemDTO[]>("/api/checklist-items"),
  });
}
export function useCreateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChecklistItemInput) =>
      fetchJson<ChecklistItemDTO>("/api/checklist-items", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklistItems() }),
  });
}
