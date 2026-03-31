"use client";

import { useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface VoiceSession {
  id: string;
  tenant_id: string;
  platform: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface VoiceCall {
  id: string;
  session_id: string;
  tenant_id: string;
  tool_name: string | null;
  cost_usd: number | null;
  created_at: string;
  duration_ms: number | null;
}

export type DateRange = "7d" | "30d" | "90d";

interface Props {
  sessions: VoiceSession[];
  calls: VoiceCall[];
  dateRange: DateRange;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function VoiceAnalytics({ sessions, calls, dateRange }: Props) {
  /* --- Aggregations ------------------------------------------------ */

  const totalSessions = sessions.length;
  const totalCalls = calls.length;

  const avgDuration = useMemo(() => {
    const durations = sessions
      .map((s) => s.duration_seconds)
      .filter((d): d is number => d !== null && d > 0);
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [sessions]);

  const totalCost = useMemo(() => {
    return calls.reduce((sum, c) => sum + (c.cost_usd ?? 0), 0);
  }, [calls]);

  /* Platform breakdown */
  const platformCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      const p = s.platform || "unknown";
      map[p] = (map[p] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [sessions]);

  /* Daily active users (last 7 days) */
  const dailyActive = useMemo(() => {
    const days = last7Days();
    const map: Record<string, Set<string>> = {};
    for (const d of days) map[d] = new Set();
    for (const s of sessions) {
      const day = s.started_at?.slice(0, 10);
      if (day && map[day]) map[day].add(s.tenant_id);
    }
    return days.map((d) => ({ date: d, count: map[d].size }));
  }, [sessions]);

  /* Tool usage */
  const toolUsage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of calls) {
      const tool = c.tool_name || "unknown";
      map[tool] = (map[tool] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [calls]);

  const maxToolCount = toolUsage.length > 0 ? toolUsage[0][1] : 1;
  const maxPlatformCount =
    platformCounts.length > 0 ? platformCounts[0][1] : 1;

  /* --- Render ------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard emoji="📞" label="Total Sessions" value={String(totalSessions)} />
        <StatCard emoji="🔧" label="Total Calls" value={String(totalCalls)} />
        <StatCard
          emoji="⏱️"
          label="Avg Duration"
          value={avgDuration > 0 ? formatDuration(avgDuration) : "—"}
        />
        <StatCard emoji="💰" label="LLM Cost" value={formatCost(totalCost)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Breakdown */}
        <div className="lf-card p-5">
          <h3 className="text-sm font-semibold mb-4">📱 Sessions by Platform</h3>
          {platformCounts.length === 0 ? (
            <p className="text-xs text-[var(--lf-muted)]">No session data</p>
          ) : (
            <div className="space-y-3">
              {platformCounts.map(([platform, count]) => (
                <div key={platform}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="capitalize font-medium">{platform}</span>
                    <span className="text-[var(--lf-muted)]">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / maxPlatformCount) * 100}%`,
                        background:
                          "linear-gradient(90deg, var(--lf-indigo), var(--lf-coral))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Active Users */}
        <div className="lf-card p-5">
          <h3 className="text-sm font-semibold mb-4">📊 Daily Active Users (7d)</h3>
          {dailyActive.every((d) => d.count === 0) ? (
            <p className="text-xs text-[var(--lf-muted)]">No activity in the last 7 days</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--lf-muted)] border-b border-gray-100">
                  <th className="text-left py-1.5 font-medium">Date</th>
                  <th className="text-right py-1.5 font-medium">Users</th>
                </tr>
              </thead>
              <tbody>
                {dailyActive.map((d) => (
                  <tr key={d.date} className="border-b border-gray-50">
                    <td className="py-1.5">{d.date}</td>
                    <td className="text-right py-1.5">
                      <span className={d.count > 0 ? "lf-badge lf-badge-active" : "lf-badge"}>
                        {d.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tool Usage */}
      <div className="lf-card p-5">
        <h3 className="text-sm font-semibold mb-4">🔧 Top 10 Tools Used</h3>
        {toolUsage.length === 0 ? (
          <p className="text-xs text-[var(--lf-muted)]">No tool usage data</p>
        ) : (
          <div className="space-y-2.5">
            {toolUsage.map(([tool, count]) => (
              <div key={tool}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-medium">{tool}</span>
                  <span className="text-[var(--lf-muted)]">{count} calls</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / maxToolCount) * 100}%`,
                      background: "var(--lf-teal)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date range indicator */}
      <p className="text-xs text-[var(--lf-muted)] text-center">
        Showing data for the last {dateRange === "7d" ? "7" : dateRange === "30d" ? "30" : "90"} days
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="lf-card p-4">
      <div className="text-lg mb-1">{emoji}</div>
      <div className="text-xs text-[var(--lf-muted)]">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
