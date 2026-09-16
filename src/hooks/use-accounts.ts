import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";
import { isNative } from "@/lib/data-source";
import { listAccounts, createAccount, deleteAccount } from "@/lib/local/reference-data";
import type { CreateAccountInput } from "@/lib/schemas/account";

export interface AccountDTO {
  id: string;
  name: string;
  type: string;
  broker: string | null;
  currency: string;
  startingBalance: number | null;
  isDemo: boolean;
}

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts(),
    queryFn: () => (isNative() ? listAccounts() : fetchJson<AccountDTO[]>("/api/accounts")),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      isNative() ? createAccount(input) : fetchJson<AccountDTO>("/api/accounts", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts() }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isNative() ? deleteAccount(id).then(() => ({ ok: true as const })) : fetchJson<{ ok: true }>(`/api/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts() }),
  });
}
