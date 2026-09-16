import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchJson } from "@/lib/api-client";
import { isNative } from "@/lib/data-source";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/local/notifications";

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  relatedEntityId: string | null;
  createdAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => (isNative() ? listNotifications() : fetchJson<NotificationDTO[]>("/api/notifications")),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      isNative()
        ? markNotificationRead(id, true)
        : fetchJson<NotificationDTO>(`/api/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ isRead: true }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      isNative() ? markAllNotificationsRead().then(() => ({ ok: true as const })) : fetchJson<{ ok: true }>("/api/notifications", { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}
