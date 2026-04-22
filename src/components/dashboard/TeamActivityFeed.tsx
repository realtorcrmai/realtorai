"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Activity = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ACTION_LABELS: Record<string, { emoji: string; verb: string }> = {
  team_created: { emoji: "🏢", verb: "created the team" },
  member_invited: { emoji: "📧", verb: "invited" },
  member_joined: { emoji: "🎉", verb: "joined the team" },
  member_removed: { emoji: "👋", verb: "removed" },
  member_left: { emoji: "🚪", verb: "left the team" },
  role_changed: { emoji: "🔄", verb: "changed role for" },
  invite_declined: { emoji: "❌", verb: "declined invite" },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function TeamActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team/activity?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setActivities(data);
        else if (data.data) setActivities(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">👥 Team Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-brand animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">👥 Team Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">No team activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">👥 Team Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map((a) => {
          const config = ACTION_LABELS[a.action] || { emoji: "📌", verb: a.action };
          const meta = a.metadata || {};
          const detail = (meta.email as string) || (meta.name as string) || "";
          return (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <span className="text-sm shrink-0">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className="text-foreground">
                  {config.verb}
                  {detail && <span className="text-muted-foreground"> {detail}</span>}
                  {typeof meta.old_role === "string" && typeof meta.new_role === "string" && (
                    <span className="text-muted-foreground"> from {meta.old_role} to {meta.new_role}</span>
                  )}
                </span>
                <span className="text-muted-foreground ml-1.5">{formatTime(a.created_at)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
