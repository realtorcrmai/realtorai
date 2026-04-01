"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/workflows";
import { NOTIFICATION_TYPE_COLORS } from "@/lib/constants";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  contact_id: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function fetchNotifications() {
    setLoading(true);
    const result = await getNotifications();
    if (result.notifications) {
      setNotifications(result.notifications);
    }
    setLoading(false);
  }

  useEffect(() => {
    const controller = new AbortController();
    getNotifications().then((result) => {
      if (!controller.signal.aborted && result.notifications) {
        setNotifications(result.notifications);
      }
    });
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => { controller.abort(); clearInterval(interval); };
  }, []);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  }

  function handleClick(notification: Notification) {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
      setOpen(false);
    }
  }

  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] rounded-xl border border-border bg-background shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="text-xs h-7"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[400px]">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No notifications yet
                </p>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${
                              NOTIFICATION_TYPE_COLORS[n.type as keyof typeof NOTIFICATION_TYPE_COLORS] || "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {n.type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                      </div>
                      {n.action_url && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* View All link */}
            <button
              onClick={() => {
                router.push("/automations/notifications");
                setOpen(false);
              }}
              className="w-full p-2.5 text-xs font-medium text-center text-primary hover:bg-muted/50 transition-colors border-t border-border"
            >
              View All Notifications
            </button>
          </div>
        </>
      )}
    </div>
  );
}
