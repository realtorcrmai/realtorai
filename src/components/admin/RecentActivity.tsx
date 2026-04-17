"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  GraduationCap,
  ArrowUpCircle,
  Shield,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface ActivityEvent {
  id: string;
  event_name: string;
  user_name?: string;
  user_id?: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  users?: { name: string; email: string } | null;
}

interface RecentActivityProps {
  events: ActivityEvent[];
}

function getEventConfig(event: ActivityEvent) {
  const meta = (event.metadata ?? {}) as Record<string, unknown>;

  switch (event.event_name) {
    case "signup":
      return {
        icon: UserPlus,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600",
        title: `New signup`,
        subtitle: getUserLabel(event),
      };
    case "onboarding_step":
      return {
        icon: GraduationCap,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        title: `Onboarding step ${meta.step ?? "?"}`,
        subtitle: getUserLabel(event),
      };
    case "plan_changed":
      return {
        icon: ArrowUpCircle,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-600",
        title: `Plan changed: ${meta.from ?? "?"} -> ${meta.to ?? "?"}`,
        subtitle: getUserLabel(event),
      };
    case "admin_action":
      return {
        icon: Shield,
        iconBg: "bg-brand/10",
        iconColor: "text-brand",
        title: formatAdminAction(meta),
        subtitle: getUserLabel(event),
      };
    case "cron_run": {
      const isError = meta.status === "error" || meta.status === "failed";
      return {
        icon: isError ? AlertCircle : CheckCircle2,
        iconBg: isError ? "bg-red-500/10" : "bg-emerald-500/10",
        iconColor: isError ? "text-red-600" : "text-emerald-600",
        title: `Cron: ${meta.cron ?? "unknown"} ${isError ? "failed" : "succeeded"}`,
        subtitle: meta.duration_ms
          ? `${meta.duration_ms}ms`
          : "",
      };
    }
    default:
      return {
        icon: CheckCircle2,
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
        title: event.event_name,
        subtitle: getUserLabel(event),
      };
  }
}

function getUserLabel(event: ActivityEvent): string {
  if (event.users?.name) return event.users.name;
  if (event.users?.email) return event.users.email;
  return event.user_id ? `User ${event.user_id.slice(0, 8)}...` : "System";
}

function formatAdminAction(meta: Record<string, unknown>): string {
  const action = String(meta.action ?? "action");
  switch (action) {
    case "create_user":
      return "Created a new user";
    case "plan_change":
      return `Changed plan: ${meta.before_state && typeof meta.before_state === "object" ? (meta.before_state as Record<string, unknown>).plan : "?"} -> ${meta.after_state && typeof meta.after_state === "object" ? (meta.after_state as Record<string, unknown>).plan : "?"}`;
    case "extend_trial":
      return `Extended trial by ${(meta as Record<string, unknown>).additional_days ?? "?"} days`;
    case "start_trial":
      return "Started a new trial";
    case "reset_onboarding":
      return "Reset user onboarding";
    case "delete_user":
      return "Deleted a user";
    case "trigger_cron":
      return `Triggered cron: ${(meta as Record<string, unknown>).cron ?? "?"}`;
    default:
      return action.replace(/_/g, " ");
  }
}

export function RecentActivity({ events }: RecentActivityProps) {
  const visible = events.slice(0, 10);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h3>
      </div>

      <div className="p-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-4 text-center">
            No recent activity to show.
          </p>
        ) : (
          <div className="space-y-0.5">
            {visible.map((event) => {
              const config = getEventConfig(event);
              const Icon = config.icon;
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {config.title}
                    </p>
                    {config.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {config.subtitle}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(event.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <Link
            href="/admin/activity"
            className="text-xs text-brand hover:underline"
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  );
}
