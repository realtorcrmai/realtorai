"use client";

import {
  Zap,
  Phone,
  MessageSquare,
  Mail,
  CheckSquare,
  Bell,
  Settings,
  XCircle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: typeof Activity; color: string; bg: string; label: string }
> = {
  workflow_auto_enrolled: {
    icon: Zap,
    color: "text-brand",
    bg: "bg-brand-muted",
    label: "Auto Enrolled",
  },
  workflow_step_auto_sms: {
    icon: Phone,
    color: "text-brand",
    bg: "bg-brand-muted",
    label: "SMS",
  },
  workflow_step_auto_whatsapp: {
    icon: MessageSquare,
    color: "text-brand",
    bg: "bg-brand-muted",
    label: "WhatsApp",
  },
  workflow_step_auto_email: {
    icon: Mail,
    color: "text-brand",
    bg: "bg-brand-muted",
    label: "Email",
  },
  workflow_step_manual_task: {
    icon: CheckSquare,
    color: "text-amber-600",
    bg: "bg-amber-50",
    label: "Manual Task",
  },
  workflow_step_auto_alert: {
    icon: Bell,
    color: "text-red-600",
    bg: "bg-red-50",
    label: "Alert",
  },
  workflow_step_system_action: {
    icon: Settings,
    color: "text-brand",
    bg: "bg-brand-muted",
    label: "System",
  },
  workflow_exited: {
    icon: XCircle,
    color: "text-gray-500",
    bg: "bg-gray-50",
    label: "Exited",
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  color: "text-gray-500",
  bg: "bg-gray-50",
  label: "Activity",
};

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 52) return `${diffWeek}w ago`;
  return new Date(dateString).toLocaleDateString();
}

const MAX_VISIBLE = 20;

export default function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const visible = activities.slice(0, MAX_VISIBLE);
  const hasMore = activities.length > MAX_VISIBLE;

  return (
    <Card>
      <details open={activities.length > 0}>
        <summary className="cursor-pointer list-none">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Activity Log
              {activities.length > 0 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {activities.length}
                </Badge>
              )}
            </CardTitle>
            <span className="text-xs text-muted-foreground select-none">
              {activities.length > 0 ? "click to toggle" : "no activities"}
            </span>
          </CardHeader>
        </summary>

        <CardContent className="pt-0 px-4 pb-3">
          {visible.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => {
                const config =
                  ACTIVITY_CONFIG[item.activity_type] ?? DEFAULT_CONFIG;
                const Icon = config.icon;

                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 leading-4 font-normal"
                        >
                          {config.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {getRelativeTime(item.created_at)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <div className="mt-3 text-center">
              <Link
                href="/automations/notifications"
                className="text-xs text-brand hover:underline"
              >
                Show More
              </Link>
            </div>
          )}
        </CardContent>
      </details>
    </Card>
  );
}
