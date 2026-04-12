"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RevenueKPIs {
  mrr: number;
  arr: number;
  arpu: number;
  payingUsers: number;
  trialConversion: number;
  churnRate: number;
}

interface PlanDistributionItem {
  plan: string;
  count: number;
  mrr: number;
  percentage: number;
}

interface ActiveTrial {
  id: string;
  name: string;
  email: string;
  trial_plan: string;
  days_left: number;
  onboarding_completed: boolean;
  feature_usage_count: number;
}

interface TrialPipeline {
  active: number;
  expiringSoon: number;
  converted30d: number;
  churned30d: number;
  activeTrials: ActiveTrial[];
}

interface ChangeLogEntry {
  created_at: string;
  user_name: string;
  from_plan: string;
  to_plan: string;
  trigger: string;
}

export interface RevenueViewProps {
  kpis: RevenueKPIs;
  distribution: PlanDistributionItem[];
  pipeline: TrialPipeline;
  changeLog: ChangeLogEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_COLORS: Record<string, string> = {
  free: "#e5e7eb",
  professional: "#2D3E50",
  studio: "#FF7A59",
  team: "#00BDA5",
};

function fmtCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Custom pie label (center text)
// ---------------------------------------------------------------------------

function CenterLabel({ viewBox, value }: { viewBox?: { cx: number; cy: number }; value: string }) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.3em" className="fill-foreground text-lg font-bold">
        {value}
      </tspan>
      <tspan x={cx} dy="1.4em" className="fill-muted-foreground text-[10px]">
        Total MRR
      </tspan>
    </text>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RevenueView({
  kpis,
  distribution,
  pipeline,
  changeLog,
}: RevenueViewProps) {
  const router = useRouter();

  const sortedTrials = useMemo(
    () => [...pipeline.activeTrials].sort((a, b) => a.days_left - b.days_left),
    [pipeline.activeTrials],
  );

  const totalMRR = useMemo(
    () => distribution.reduce((s, d) => s + d.mrr, 0),
    [distribution],
  );

  // Conversion + churn rates for pipeline summary
  const pipelineConversionRate = useMemo(() => {
    const total = pipeline.converted30d + pipeline.churned30d;
    return total > 0 ? Math.round((pipeline.converted30d / total) * 100) : 0;
  }, [pipeline]);

  const pipelineChurnRate = useMemo(() => {
    const total = pipeline.converted30d + pipeline.churned30d;
    return total > 0 ? Math.round((pipeline.churned30d / total) * 100) : 0;
  }, [pipeline]);

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: KPI Cards                                               */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Revenue KPIs">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPICard label="MRR" value={fmtCurrency(kpis.mrr)} />
          <KPICard label="ARR" value={fmtCurrency(kpis.arr)} />
          <KPICard label="ARPU" value={fmtCurrency(kpis.arpu)} />
          <KPICard label="Trial Conversion" value={`${kpis.trialConversion}%`} />
          <KPICard
            label="Churn Rate"
            value={`${kpis.churnRate}%`}
            valueClassName={
              kpis.churnRate > 5
                ? "text-red-600"
                : kpis.churnRate > 2
                  ? "text-amber-600"
                  : undefined
            }
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Plan Distribution + MRR Placeholder                     */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Plan Distribution">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Donut chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Plan Distribution
            </h2>

            {distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No data
              </p>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="count"
                        nameKey="plan"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={2}
                      >
                        {distribution.map((entry) => (
                          <Cell
                            key={entry.plan}
                            fill={PLAN_COLORS[entry.plan] ?? "#94a3b8"}
                          />
                        ))}
                        {/* Center label */}
                        <CenterLabel value={fmtCurrency(totalMRR)} />
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} users`,
                          capitalize(String(name)),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend table */}
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left py-1.5 font-medium">Plan</th>
                      <th className="text-right py-1.5 font-medium">Users</th>
                      <th className="text-right py-1.5 font-medium">MRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribution.map((d) => (
                      <tr key={d.plan} className="border-b border-border last:border-0">
                        <td className="py-1.5 flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full inline-block"
                            style={{
                              backgroundColor:
                                PLAN_COLORS[d.plan] ?? "#94a3b8",
                            }}
                          />
                          {capitalize(d.plan)}
                        </td>
                        <td className="text-right py-1.5 tabular-nums">
                          {d.count}
                        </td>
                        <td className="text-right py-1.5 tabular-nums">
                          {fmtCurrency(d.mrr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Right — MRR timeline placeholder */}
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-foreground">
              {fmtCurrency(kpis.mrr)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly Recurring Revenue
            </p>
            <p className="text-xs text-muted-foreground mt-6 italic">
              MRR timeline chart coming in v2
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Trial Pipeline                                          */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Trial Pipeline">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Trial Pipeline
          </h2>

          {/* Part A: Summary badges */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <SummaryBadge label="Active Trials" value={pipeline.active} />
            <SummaryBadge
              label="Expiring < 7d"
              value={pipeline.expiringSoon}
              variant={pipeline.expiringSoon > 0 ? "amber" : "default"}
            />
            <SummaryBadge
              label="Converted 30d"
              value={`${pipeline.converted30d} (${pipelineConversionRate}%)`}
            />
            <SummaryBadge
              label="Churned 30d"
              value={`${pipeline.churned30d} (${pipelineChurnRate}%)`}
            />
          </div>

          {/* Part B: Active trials table */}
          {sortedTrials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active trials
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">User</th>
                    <th className="text-left px-3 py-2 font-medium">Trial Plan</th>
                    <th className="text-left px-3 py-2 font-medium">Days Left</th>
                    <th className="text-left px-3 py-2 font-medium">Onboarded</th>
                    <th className="text-right px-3 py-2 font-medium">Feature Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTrials.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/admin/users/${t.id}`)}
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{t.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{t.email}</p>
                      </td>
                      <td className="px-3 py-2">
                        {capitalize(t.trial_plan || "—")}
                      </td>
                      <td className="px-3 py-2">
                        <DaysLeftBadge days={t.days_left} />
                      </td>
                      <td className="px-3 py-2">
                        {t.onboarding_completed ? (
                          <span className="text-emerald-600 font-medium">Complete</span>
                        ) : (
                          <span className="text-amber-600">In progress</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {t.feature_usage_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4: Plan Change Log                                         */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Plan Change Log">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Recent Plan Changes
          </h2>

          {changeLog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No plan changes recorded
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="text-left px-3 py-2 font-medium">User</th>
                    <th className="text-left px-3 py-2 font-medium">From</th>
                    <th className="text-left px-3 py-2 font-medium">To</th>
                    <th className="text-left px-3 py-2 font-medium">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {changeLog.slice(0, 20).map((entry, i) => (
                    <tr
                      key={`${entry.created_at}-${i}`}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {safeFormatDate(entry.created_at)}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {entry.user_name || "Unknown"}
                      </td>
                      <td className="px-3 py-2">
                        {capitalize(entry.from_plan || "—")}
                      </td>
                      <td className="px-3 py-2">
                        {capitalize(entry.to_plan || "—")}
                      </td>
                      <td className="px-3 py-2">
                        <TriggerBadge trigger={entry.trigger} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KPICard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className={`text-2xl font-bold ${valueClassName ?? "text-foreground"}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function SummaryBadge({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "amber";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
        variant === "amber"
          ? "bg-amber-50 text-amber-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {label}: <span className="font-bold">{value}</span>
    </span>
  );
}

function DaysLeftBadge({ days }: { days: number }) {
  let cls = "bg-muted text-muted-foreground";
  if (days <= 3) cls = "bg-red-50 text-red-700";
  else if (days <= 7) cls = "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {days}d
    </span>
  );
}

function TriggerBadge({ trigger }: { trigger: string }) {
  let cls = "bg-muted text-muted-foreground";
  if (trigger === "admin") cls = "bg-primary/10 text-primary";
  else if (trigger === "trial_convert") cls = "bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {trigger || "—"}
    </span>
  );
}

function safeFormatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}
