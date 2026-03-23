"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Filter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
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
  listing_id: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "urgent", label: "Urgent" },
  { value: "task", label: "Tasks" },
  { value: "workflow", label: "Workflow" },
  { value: "info", label: "Info" },
];

export function NotificationList({
  notifications: initialNotifications,
}: {
  notifications: Notification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.is_read;
    return n.type === filter;
  });

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
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          {FILTER_OPTIONS.map((opt) => {
            const count =
              opt.value === "all"
                ? notifications.length
                : opt.value === "unread"
                ? unreadCount
                : notifications.filter((n) => n.type === opt.value).length;
            if (count === 0 && opt.value !== "all") return null;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  filter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
                {count > 0 && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {filter === "unread"
                  ? "All caught up! No unread notifications."
                  : `No ${filter} notifications.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((n) => (
            <Card
              key={n.id}
              className={`transition-all hover:shadow-sm cursor-pointer ${
                !n.is_read
                  ? "border-primary/20 bg-primary/[0.02]"
                  : "opacity-75"
              }`}
            >
              <CardContent className="py-3">
                <div
                  className="flex items-start gap-3"
                  onClick={() => handleClick(n)}
                >
                  {/* Unread dot */}
                  <div className="pt-1 w-3 shrink-0">
                    {!n.is_read && (
                      <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          NOTIFICATION_TYPE_COLORS[
                            n.type as keyof typeof NOTIFICATION_TYPE_COLORS
                          ] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {n.type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkRead(n.id);
                        }}
                        disabled={isPending}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {n.action_url && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
