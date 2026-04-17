"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { RefreshButton } from "@/components/admin/RefreshButton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KPIs {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}

interface PerUserRow {
  realtor_id: string;
  name: string;
  sent: number;
  delivered: number;
  open_rate: number;
  bounce_rate: number;
  status: string;
}

interface BounceEntry {
  created_at: string;
  contact_name: string;
  contact_email: string;
  event_type: string;
  realtor_name: string;
  metadata: Record<string, unknown> | null;
}

interface EmailOpsViewProps {
  kpis: KPIs;
  perUser: PerUserRow[];
  bounceLog: BounceEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function healthDot(isHealthy: boolean, isWarning?: boolean) {
  if (isHealthy) {
    return <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />;
  }
  if (isWarning) {
    return <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />;
  }
  return <span className="inline-block h-2 w-2 rounded-full bg-red-500" />;
}

function userStatus(bounceRate: number): { label: string; color: string } {
  if (bounceRate > 10) return { label: "Critical", color: "bg-red-50 text-red-700" };
  if (bounceRate >= 5) return { label: "Warning", color: "bg-amber-50 text-amber-700" };
  return { label: "Healthy", color: "bg-emerald-50 text-emerald-700" };
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Per-User", value: "per-user" },
  { label: "Bounces", value: "bounces" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailOpsView({ kpis, perUser, bounceLog }: EmailOpsViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();

  const deliveryRate = pct(kpis.delivered, kpis.sent);
  const openRate = pct(kpis.opened, kpis.delivered);
  const bounceRate = pct(kpis.bounced, kpis.sent);
  const complaintRate =
    kpis.sent > 0
      ? Math.round((kpis.complained / kpis.sent) * 10000) / 100
      : 0;

  // Sort per-user by bounce rate descending (worst first)
  const sortedPerUser = [...perUser].sort(
    (a, b) => b.bounce_rate - a.bounce_rate
  );

  return (
    <div className="space-y-0">
      <PageHeader
        title="Email Operations"
        subtitle="Delivery health and diagnostics"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actions={<RefreshButton />}
      />

      <div className="p-6 space-y-6">
        {/* ── Tab: Overview ── */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPICard
                label="Sent (7d)"
                value={kpis.sent.toLocaleString()}
                dot={healthDot(true)}
              />
              <KPICard
                label="Delivery Rate"
                value={`${deliveryRate}%`}
                dot={healthDot(deliveryRate >= 98, deliveryRate >= 95)}
              />
              <KPICard
                label="Open Rate"
                value={`${openRate}%`}
                dot={healthDot(openRate >= 20, openRate >= 10)}
              />
              <KPICard
                label="Bounce Rate"
                value={`${bounceRate}%`}
                dot={healthDot(bounceRate < 2, bounceRate < 5)}
              />
              <KPICard
                label="Complaint Rate"
                value={`${complaintRate}%`}
                dot={healthDot(complaintRate < 0.05, complaintRate < 0.1)}
              />
            </div>

            {/* Delivery Funnel */}
            <div className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Delivery Funnel
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <FunnelBar
                  label="Sent"
                  count={kpis.sent}
                  max={kpis.sent}
                />
                <FunnelBar
                  label="Delivered"
                  count={kpis.delivered}
                  max={kpis.sent}
                />
                <FunnelBar
                  label="Opened"
                  count={kpis.opened}
                  max={kpis.sent}
                />
                <FunnelBar
                  label="Clicked"
                  count={kpis.clicked}
                  max={kpis.sent}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Tab: Per-User ── */}
        {activeTab === "per-user" && (
          <div className="bg-card border border-border rounded-lg">
            {sortedPerUser.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No per-user email stats available for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Realtor
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Sent (7d)
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Delivered
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Open Rate
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Bounce Rate
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPerUser.map((row) => {
                      const st = userStatus(row.bounce_rate);
                      return (
                        <tr
                          key={row.realtor_id}
                          className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() =>
                            router.push(`/admin/users/${row.realtor_id}`)
                          }
                        >
                          <td className="px-4 py-2.5 font-medium text-foreground">
                            {row.name}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                            {row.sent}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                            {row.delivered}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                            {row.open_rate}%
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                            {row.bounce_rate}%
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}
                            >
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Bounces ── */}
        {activeTab === "bounces" && (
          <div className="bg-card border border-border rounded-lg">
            {bounceLog.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No bounces or complaints recorded in the last 7 days.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Time
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Recipient
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Type
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                        Realtor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bounceLog.map((entry, idx) => {
                      const isHardBounce =
                        entry.event_type === "bounced" &&
                        (entry.metadata as Record<string, unknown>)?.bounce_type !== "soft";
                      const isComplaint = entry.event_type === "complained";
                      const isSoft =
                        entry.event_type === "bounced" &&
                        (entry.metadata as Record<string, unknown>)?.bounce_type === "soft";

                      let typeLabel = "Hard";
                      let typeColor = "bg-red-50 text-red-700";
                      if (isSoft) {
                        typeLabel = "Soft";
                        typeColor = "bg-amber-50 text-amber-700";
                      }
                      if (isComplaint) {
                        typeLabel = "Complaint";
                        typeColor = "bg-red-50 text-red-700";
                      }

                      return (
                        <tr
                          key={idx}
                          className={`border-b border-border ${
                            isHardBounce || isComplaint ? "bg-red-50/30" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                            {relativeTime(entry.created_at)}
                          </td>
                          <td className="px-4 py-2.5 text-foreground">
                            {entry.contact_email || entry.contact_name || "--"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}
                            >
                              {typeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {entry.realtor_name || "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KPICard({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        {dot}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

function FunnelBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const percentage = max > 0 ? Math.round((count / max) * 100) : 0;
  const widthPercent = max > 0 ? (count / max) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
        <div
          className="h-full bg-primary rounded-md transition-all duration-500"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="text-xs text-foreground tabular-nums w-12 text-right">
        {count.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
        {percentage}%
      </span>
    </div>
  );
}
