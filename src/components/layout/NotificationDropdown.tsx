"use client";

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  getUnreadCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_type: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  showing_confirmed: "\uD83D\uDFE2",
  showing_requested: "\uD83D\uDFE1",
  showing_cancelled: "\uD83D\uDD34",
  email_bounced: "\uD83D\uDCE7",
  task_due: "\u2705",
  new_lead: "\uD83D\uDC64",
  team_invite: "\uD83D\uDC65",
  team_invite_accepted: "\uD83C\uDF89",
  team_invite_declined: "\uD83D\uDEAB",
};

function getIcon(type: string): string {
  return TYPE_ICONS[type] ?? "\uD83D\uDD14";
}

function getLink(related_type: string | null, related_id: string | null): string | null {
  if (!related_type || !related_id) return null;
  switch (related_type) {
    case "contact":
      return `/contacts/${related_id}`;
    case "listing":
      return `/listings/${related_id}`;
    case "appointment":
      return `/showings/${related_id}`;
    case "task":
      return "/tasks";
    default:
      return null;
  }
}

export function NotificationDropdown() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    async function fetchCount() {
      try {
        const count = await getUnreadCount();
        if (!mountedRef.current) return;
        setUnreadCount(count);
      } catch {
        // Graceful: table may not exist yet
      }
    }
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Fetch notifications when popover opens (always refresh on open)
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      (async () => {
        try {
          const data = await getNotifications(15);
          if (!mountedRef.current) return;
          setNotifications(data as Notification[]);
          setLoaded(true);
        } catch {
          // Graceful: table may not exist yet
        }
      })();
    }
  }, []);

  const handleMarkRead = useCallback(
    (id: string) => {
      startTransition(async () => {
        try {
          await markNotificationRead(id);
          if (!mountedRef.current) return;
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
          // ignore
        }
      });
    },
    []
  );

  const handleMarkAllRead = useCallback(() => {
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
        if (!mountedRef.current) return;
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      } catch {
        // ignore
      }
    });
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="p-2 rounded-lg hover:bg-muted transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand text-white text-[10px] font-semibold leading-none px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 max-h-[420px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-brand hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <span className="text-2xl mb-1">{"\uD83D\uDD14"}</span>
              <span className="text-sm">No notifications</span>
            </div>
          ) : (
            notifications.map((n) => {
              const link = getLink(n.related_type, n.related_id);
              const content = (
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer ${
                    !n.is_read ? "border-l-2 border-brand bg-brand/5" : "border-l-2 border-transparent"
                  }`}
                  onClick={() => {
                    if (!n.is_read) handleMarkRead(n.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!n.is_read) handleMarkRead(n.id);
                    }
                  }}
                >
                  <span className="text-base mt-0.5 shrink-0">{getIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    {n.type === "team_invite" && n.related_id && !n.is_read && (
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            try {
                              const { acceptInvite } = await import("@/actions/team");
                              const result = await acceptInvite(n.related_id!);
                              if (result.error) {
                                alert(result.error);
                              } else {
                                handleMarkRead(n.id);
                                window.location.href = "/settings/team";
                              }
                            } catch {
                              alert("Failed to accept invite");
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-brand text-white text-xs font-medium hover:bg-brand/90 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            try {
                              const { declineInvite } = await import("@/actions/team");
                              const result = await declineInvite(n.related_id!);
                              if (result.error) {
                                alert(result.error);
                              } else {
                                handleMarkRead(n.id);
                                // Update notification body to show declined
                                setNotifications((prev) =>
                                  prev.map((notif) =>
                                    notif.id === n.id
                                      ? { ...notif, body: "Invite declined.", is_read: true }
                                      : notif
                                  )
                                );
                              }
                            } catch {
                              alert("Failed to decline invite");
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );

              return link ? (
                <Link
                  key={n.id}
                  href={link}
                  onClick={() => {
                    if (!n.is_read) handleMarkRead(n.id);
                    setOpen(false);
                  }}
                >
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
