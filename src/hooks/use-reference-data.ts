import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";
import { isNative } from "@/lib/data-source";
import {
  listAssets, createAsset, deleteAsset,
  listStrategies, createStrategy,
  listMistakes, createMistake,
  listChecklistItems, createChecklistItem,
} from "@/lib/local/reference-data";
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
  return useQuery({ queryKey: queryKeys.assets(), queryFn: () => (isNative() ? listAssets() : fetchJson<AssetDTO[]>("/api/assets")) });
}
export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetInput) =>
      isNative() ? createAsset(input) : fetchJson<AssetDTO>("/api/assets", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.assets() }),
  });
}
export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isNative() ? deleteAsset(id).then(() => ({ ok: true as const })) : fetchJson<{ ok: true }>(`/api/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.assets() }),
  });
}

export function useStrategies() {
  return useQuery({ queryKey: queryKeys.strategies(), queryFn: () => (isNative() ? listStrategies() : fetchJson<StrategyDTO[]>("/api/strategies")) });
}
export function useCreateStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStrategyInput) =>
      isNative() ? createStrategy(input) : fetchJson<StrategyDTO>("/api/strategies", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.strategies() }),
  });
}

export function useMistakes() {
  return useQuery({ queryKey: queryKeys.mistakes(), queryFn: () => (isNative() ? listMistakes() : fetchJson<MistakeDTO[]>("/api/mistakes")) });
}
export function useCreateMistake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMistakeInput) =>
      isNative() ? createMistake(input) : fetchJson<MistakeDTO>("/api/mistakes", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.mistakes() }),
  });
}

export function useChecklistItems() {
  return useQuery({
    queryKey: queryKeys.checklistItems(),
    queryFn: () => (isNative() ? listChecklistItems() : fetchJson<ChecklistItemDTO[]>("/api/checklist-items")),
  });
}
export function useCreateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChecklistItemInput) =>
      isNative()
        ? createChecklistItem(input)
        : fetchJson<ChecklistItemDTO>("/api/checklist-items", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.checklistItems() }),
  });
}
