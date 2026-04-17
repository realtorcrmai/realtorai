"use client";

import { useState, useTransition, useMemo } from "react";
import { CheckCircle2, Circle, Pencil, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { updateAdminUserFields } from "@/actions/admin";
import { toast } from "sonner";

interface UserDetailProfileProps {
  user: any;
  onRefresh: () => void;
}

const ACCOUNT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "role", label: "Role" },
  { key: "brokerage", label: "Brokerage" },
  { key: "license_number", label: "License #" },
  { key: "timezone", label: "Timezone" },
  { key: "signup_source", label: "Signup Source", readOnly: true },
] as const;

function computeCompleteness(user: any) {
  const checks = [
    { label: "Name set", done: (user.name?.length ?? 0) >= 2 },
    { label: "Email verified", done: !!user.email_verified },
    { label: "Phone verified", done: !!user.phone_verified },
    { label: "Avatar uploaded", done: !!user.avatar_url },
    { label: "Brokerage", done: !!user.brokerage },
    { label: "License #", done: !!user.license_number },
    {
      label: "Timezone set",
      done: !!user.timezone && user.timezone !== "America/Vancouver",
    },
    { label: "Bio written", done: (user.bio?.length ?? 0) >= 10 },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  const percentage = Math.round((doneCount / checks.length) * 100);

  return { checks, percentage };
}

export function UserDetailProfile({ user, onRefresh }: UserDetailProfileProps) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { checks, percentage } = useMemo(
    () => computeCompleteness(user),
    [user]
  );

  function startEditing() {
    const initial: Record<string, string> = {};
    for (const field of ACCOUNT_FIELDS) {
      if ("readOnly" in field && field.readOnly) continue;
      initial[field.key] = user[field.key] ?? "";
    }
    setDraft(initial);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft({});
  }

  function handleSave() {
    // Build only changed fields
    const changed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(draft)) {
      const original = user[key] ?? "";
      if (value !== original) {
        changed[key] = value || null;
      }
    }

    if (Object.keys(changed).length === 0) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateAdminUserFields(user.id, changed);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User updated successfully");
        setEditing(false);
        onRefresh();
      }
    });
  }

  // Plan history from recentEvents
  const planEvents = (user._recentEvents ?? []).filter(
    (e: any) => e.event_name === "plan_changed"
  );

  return (
    <div className="space-y-6">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Account Information */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Account Information
            </h3>
            {!editing ? (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand/80 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand hover:bg-brand/90 px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
          <div className="px-4 py-1">
            {ACCOUNT_FIELDS.map((field) => {
              const isReadOnly = "readOnly" in field && field.readOnly;
              const value = user[field.key] ?? "";

              return (
                <div
                  key={field.key}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0"
                >
                  <span className="text-sm text-muted-foreground w-32 shrink-0">
                    {field.label}
                  </span>
                  {editing && !isReadOnly ? (
                    <input
                      type="text"
                      value={draft[field.key] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="flex-1 text-sm text-foreground bg-muted/30 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand"
                      aria-label={field.label}
                    />
                  ) : (
                    <span className="text-sm text-foreground text-right flex-1 truncate">
                      {value || (
                        <span className="text-muted-foreground italic">
                          Not set
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Two stacked cards */}
        <div className="space-y-6">
          {/* Profile Completeness */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Profile Completeness
            </h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-foreground">
                {percentage}%
              </span>
              <span className="text-xs text-muted-foreground">complete</span>
            </div>
            <div className="h-2 rounded-full bg-muted mb-4">
              <div
                className="h-2 rounded-full bg-brand transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="space-y-1.5">
              {checks.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      item.done
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Quick Stats
            </h3>
            <div className="space-y-0">
              {[
                {
                  label: "Total Sessions",
                  value: user.session_count ?? "—",
                },
                {
                  label: "Last Active",
                  value: user.last_active_at
                    ? formatDistanceToNow(new Date(user.last_active_at), {
                        addSuffix: true,
                      })
                    : "Never",
                },
                {
                  label: "Onboarding",
                  value: user.onboarding_completed
                    ? "Completed"
                    : `Step ${user.onboarding_step ?? 1}`,
                },
                {
                  label: "Contacts",
                  value: user._counts?.contacts ?? 0,
                },
                {
                  label: "Listings",
                  value: user._counts?.listings ?? 0,
                },
                {
                  label: "Emails Sent",
                  value: user._counts?.newsletters ?? 0,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground font-medium">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Plan History Timeline (full width) */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Plan History
        </h3>
        {planEvents.length === 0 ? (
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-brand" />
            </div>
            <p className="text-sm text-muted-foreground">
              Account created on{" "}
              {format(new Date(user.created_at), "MMM d, yyyy")} —{" "}
              {user.plan ?? "free"} plan
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {planEvents.map((event: any, i: number) => {
              const isCurrent = i === 0;
              return (
                <div key={event.id ?? i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        isCurrent ? "bg-brand" : "bg-muted-foreground"
                      }`}
                    />
                    {i < planEvents.length - 1 && (
                      <div className="w-px h-8 bg-border" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-foreground">
                      Changed from{" "}
                      <span className="font-medium">
                        {event.metadata?.from ?? "unknown"}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {event.metadata?.to ?? "unknown"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(
                        new Date(event.created_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            {/* Account creation anchor */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Account created on{" "}
                {format(new Date(user.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
