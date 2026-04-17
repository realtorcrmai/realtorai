"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AuditLogProps {
  events: Array<{
    id: string;
    event_name: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    users?: { name?: string; email?: string } | null;
  }>;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAction(meta: Record<string, unknown> | null): string {
  if (!meta) return "Unknown action";

  const action = String(meta.action ?? "");
  const userName =
    String(meta.user_name ?? meta.target_user ?? meta.email ?? "a user");
  const email = String(meta.email ?? meta.target_email ?? "");

  switch (action) {
    case "plan_change":
      return `Changed ${userName}'s plan from ${meta.from_plan ?? meta.from ?? "?"} to ${meta.to_plan ?? meta.to ?? "?"}`;
    case "feature_toggle":
      return `Toggled ${meta.feature ?? "a feature"} for ${userName}`;
    case "user_activate":
      return `Activated ${userName}`;
    case "user_deactivate":
      return `Deactivated ${userName}`;
    case "user_delete":
      return `Deleted user ${email || userName}`;
    case "user_create":
      return `Created user ${email || userName}`;
    case "trial_start":
      return `Started ${meta.plan ?? meta.trial_plan ?? "Pro"} trial for ${userName} (${meta.days ?? 14} days)`;
    case "bulk_plan_change":
      return `Bulk changed plan to ${meta.plan ?? meta.to_plan ?? "?"} for ${meta.count ?? "multiple"} users`;
    case "trigger_cron":
      return `Triggered cron: ${meta.cron ?? "unknown"}`;
    default:
      return action
        ? `${action.replace(/_/g, " ")} — ${userName}`
        : "Unknown action";
  }
}

export function AuditLog({ events }: AuditLogProps) {
  const [open, setOpen] = useState(false);

  const adminEvents = events.filter(
    (e) => e.event_name === "admin_action"
  );

  return (
    <div className="bg-card border border-border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <h3 className="text-sm font-semibold text-foreground">
          Admin Audit Log
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-4">
          {adminEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No admin actions recorded yet.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium w-24">Time</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {adminEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap align-top">
                      {formatTimestamp(evt.created_at)}
                    </td>
                    <td className="py-2 text-sm text-foreground">
                      {formatAction(
                        evt.metadata as Record<string, unknown> | null
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
