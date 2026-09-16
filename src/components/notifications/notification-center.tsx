"use client";

import { useEffect, useRef } from "react";
import { Bell, AlertTriangle, TrendingDown, FileText, BarChart3, Newspaper } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSound } from "@/hooks/use-sound";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type NotificationDTO,
} from "@/hooks/use-notifications";

const ICONS: Record<string, typeof Bell> = {
  WEEKLY_REPORT_READY: FileText,
  MONTHLY_REPORT_READY: FileText,
  REPEATED_MISTAKE: AlertTriangle,
  MULTIPLE_LOSSES_SAME_SETUP: TrendingDown,
  LOW_RR: AlertTriangle,
  NEW_STATS: BarChart3,
  NEWS_MORNING: Newspaper,
  NEWS_UPCOMING: Newspaper,
};

function NotificationRow({ notification }: { notification: NotificationDTO }) {
  const markRead = useMarkNotificationRead();
  const Icon = ICONS[notification.type] ?? Bell;

  return (
    <button
      onClick={() => !notification.isRead && markRead.mutate(notification.id)}
      className={cn(
        "flex w-full animate-in fade-in slide-in-from-right-2 gap-3 rounded-xl px-3 py-2.5 text-left duration-300 ease-out transition-colors hover:bg-accent",
        !notification.isRead && "bg-accent/40"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          notification.isRead ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{notification.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
    </button>
  );
}

export function NotificationCenter() {
  const { data: notificationsData } = useNotifications();
  const notifications = notificationsData ?? [];
  const markAllRead = useMarkAllNotificationsRead();
  const { playNotification } = useSound();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Chimes only when unread count *increases* after the real data has
  // loaded — never on the very first successful fetch (which may already
  // contain a backlog of unread notifications from before this session) and
  // never when it drops from marking things read. Gating on `notificationsData`
  // (undefined until the query resolves) rather than the defaulted `[]`
  // avoids a false "increase" the instant real data replaces the placeholder.
  const previousUnreadCount = useRef<number | null>(null);
  useEffect(() => {
    if (notificationsData === undefined) return;
    if (previousUnreadCount.current != null && unreadCount > previousUnreadCount.current) {
      playNotification();
    }
    previousUnreadCount.current = unreadCount;
  }, [notificationsData, unreadCount, playNotification]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full transition-transform active:scale-90">
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="pulse-ring absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-destructive text-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="h-[min(360px,60vh)]">
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications yet" description="You'll see alerts here as you journal trades." className="border-none py-8" />
          ) : (
            <div className="stagger-in space-y-1 px-1 pb-1">
              {notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
