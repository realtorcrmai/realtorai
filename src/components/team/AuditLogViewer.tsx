"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuditEntry = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user_id: string;
};

const ACTION_LABELS: Record<string, string> = {
  team_created: "Created team",
  role_change: "Changed role",
  member_removed: "Removed member",
  ownership_transferred: "Transferred ownership",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/team/audit-log?limit=50");
        const data = await r.json();
        if (Array.isArray(data)) setEntries(data);
        else if (data.data) setEntries(data.data);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = filter
    ? entries.filter((e) => e.action.includes(filter))
    : entries;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">🔒 Audit Log</CardTitle>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          >
            <option value="">All actions</option>
            <option value="role_change">Role changes</option>
            <option value="member_removed">Removals</option>
            <option value="ownership">Ownership transfers</option>
            <option value="team_created">Team creation</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-brand animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No audit entries found</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filtered.map((entry) => {
              const details = entry.details || {};
              return (
                <div key={entry.id} className="flex items-start gap-3 text-xs border-b border-border/30 pb-2 last:border-0">
                  <span className="text-muted-foreground shrink-0 w-28">{formatDate(entry.created_at)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{ACTION_LABELS[entry.action] || entry.action}</span>
                    {typeof details.target_email === "string" && (
                      <span className="text-muted-foreground"> — {details.target_email}</span>
                    )}
                    {typeof details.old_role === "string" && typeof details.new_role === "string" && (
                      <span className="text-muted-foreground"> ({details.old_role} → {details.new_role})</span>
                    )}
                    {typeof details.removed_email === "string" && (
                      <span className="text-muted-foreground"> — {details.removed_email}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
