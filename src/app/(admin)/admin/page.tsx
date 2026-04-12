import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getAdminOverviewKPIs,
  getRecentAdminActivity,
  getUsersNeedingAttention,
  getOnboardingFunnel,
  getFeatureAdoption,
  getAuditLog,
} from "@/actions/analytics";
import { OverviewKPIs } from "@/components/admin/OverviewKPIs";
import { NeedsAttention } from "@/components/admin/NeedsAttention";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { QuickActions } from "@/components/admin/QuickActions";
import { OnboardingFunnel } from "@/components/admin/OnboardingFunnel";
import { FeatureAdoptionTable } from "@/components/admin/FeatureAdoptionTable";
import { AuditLog } from "@/components/admin/AuditLog";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

export const dynamic = "force-dynamic";

type DateRange = "7d" | "30d" | "90d";
function parseRange(value: string | undefined): DateRange {
  if (value === "7d" || value === "90d") return value;
  return "30d";
}

const DEFAULT_KPIS = {
  totalUsers: 0,
  mrr: 0,
  activeToday: 0,
  onboardingRate: 0,
  trialConversion: 0,
  systemOk: true,
};

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/**
 * Flatten the grouped attention data into a single sorted array
 * with issue labels and types.
 */
function flattenAttentionUsers(
  data: {
    expiringTrials: Array<{ id: string; name: string; email: string }>;
    stuckOnboarding: Array<{ id: string; name: string; email: string }>;
    inactiveUsers: Array<{ id: string; name: string; email: string }>;
    highBounceContacts: Array<{ id: string; name: string; email: string }>;
  } | null
) {
  if (!data) return [];

  const result: Array<{
    id: string;
    name: string;
    email: string;
    issue: string;
    issueType: string;
  }> = [];

  for (const u of data.expiringTrials) {
    result.push({
      id: u.id,
      name: u.name ?? "Unnamed",
      email: u.email ?? "",
      issue: "Trial expiring",
      issueType: "trial_expiring",
    });
  }

  for (const u of data.stuckOnboarding) {
    result.push({
      id: u.id,
      name: u.name ?? "Unnamed",
      email: u.email ?? "",
      issue: "Stuck onboarding",
      issueType: "stuck_onboarding",
    });
  }

  for (const u of data.inactiveUsers) {
    result.push({
      id: u.id,
      name: u.name ?? "Unnamed",
      email: u.email ?? "",
      issue: "Inactive 7+ days",
      issueType: "inactive",
    });
  }

  for (const u of data.highBounceContacts) {
    result.push({
      id: u.id,
      name: u.name ?? "Unnamed",
      email: u.email ?? "",
      issue: "High bounce rate",
      issueType: "high_bounce",
    });
  }

  return result.slice(0, 5);
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") redirect("/");

  const params = await searchParams;
  const range = parseRange(params.range);

  const [kpisResult, activityResult, attentionResult, funnelResult, adoptionResult, auditResult] = await Promise.all([
    getAdminOverviewKPIs(range),
    getRecentAdminActivity(10),
    getUsersNeedingAttention(),
    getOnboardingFunnel(range),
    getFeatureAdoption(range),
    getAuditLog(20),
  ]);

  const userName = session.user.name?.split(" ")[0] || "Admin";

  const kpis = kpisResult.data ?? DEFAULT_KPIS;
  const events = activityResult.data ?? [];
  const auditEvents = (auditResult.data ?? []) as Array<{
    id: string;
    event_name: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    users?: { name?: string; email?: string } | null;
  }>;
  const attentionUsers = flattenAttentionUsers(
    attentionResult.data ?? null
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Good {getGreeting()}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker />
          <RefreshButton />
        </div>
      </div>

      {/* KPI Cards */}
      <OverviewKPIs kpis={kpis} />

      {/* Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RecentActivity events={events} />
        </div>
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
      </div>

      {/* Onboarding Funnel + Feature Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OnboardingFunnel data={funnelResult.data ?? []} />
        <FeatureAdoptionTable
          data={(adoptionResult.data ?? []).map((f) => ({
            feature: f.feature,
            users: f.uniqueUsers,
            actions: f.totalEvents,
            adoptionPct: f.adoptionPercent,
            trend: f.trend,
          }))}
        />
      </div>

      {/* Audit Log */}
      <AuditLog events={auditEvents} />

      {/* Needs Attention */}
      <NeedsAttention users={attentionUsers} />
    </div>
  );
}
