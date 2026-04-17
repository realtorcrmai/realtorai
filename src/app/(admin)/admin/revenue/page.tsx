import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getRevenueKPIs,
  getPlanDistribution,
  getTrialPipeline,
  getPlanChangeLog,
} from "@/actions/analytics";
import { RevenueView } from "@/components/admin/RevenueView";
import type { RevenueViewProps } from "@/components/admin/RevenueView";
import { PageHeader } from "@/components/layout/PageHeader";
import { RefreshButton } from "@/components/admin/RefreshButton";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Default values when a query fails
// ---------------------------------------------------------------------------

const DEFAULT_KPIS: RevenueViewProps["kpis"] = {
  mrr: 0,
  arr: 0,
  arpu: 0,
  payingUsers: 0,
  trialConversion: 0,
  churnRate: 0,
};

const DEFAULT_PIPELINE: RevenueViewProps["pipeline"] = {
  active: 0,
  expiringSoon: 0,
  converted30d: 0,
  churned30d: 0,
  activeTrials: [],
};

// ---------------------------------------------------------------------------
// Adapt raw data to component props
// ---------------------------------------------------------------------------

function adaptKPIs(
  raw: Awaited<ReturnType<typeof getRevenueKPIs>>["data"],
): RevenueViewProps["kpis"] {
  if (!raw) return DEFAULT_KPIS;
  return {
    mrr: raw.mrr,
    arr: raw.arr,
    arpu: raw.arpu,
    payingUsers: raw.payingUsers,
    trialConversion: raw.trialConversionRate ?? 0,
    churnRate: raw.churnRate,
  };
}

function adaptPipeline(
  raw: Awaited<ReturnType<typeof getTrialPipeline>>["data"],
): RevenueViewProps["pipeline"] {
  if (!raw) return DEFAULT_PIPELINE;

  const now = Date.now();
  const activeTrials = (raw.activeTrials ?? []).map((t) => {
    const daysLeft = t.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(t.trial_ends_at).getTime() - now) / 86400000))
      : 0;
    return {
      id: t.id,
      name: t.name ?? "",
      email: t.email ?? "",
      trial_plan: t.trial_plan ?? t.plan ?? "free",
      days_left: daysLeft,
      onboarding_completed: false, // enriched below if available
      feature_usage_count: 0,
    };
  });

  return {
    active: raw.activeCount ?? activeTrials.length,
    expiringSoon: raw.expiringSoonCount ?? 0,
    converted30d: raw.convertedLast30d ?? 0,
    churned30d: raw.churnedLast30d ?? 0,
    activeTrials,
  };
}

function adaptChangeLog(
  raw: Awaited<ReturnType<typeof getPlanChangeLog>>["data"],
): RevenueViewProps["changeLog"] {
  if (!raw) return [];
  return raw.map((entry) => {
    const meta = (entry.metadata ?? {}) as Record<string, unknown>;
    const user = entry.users as { name?: string; email?: string } | null | undefined;
    return {
      created_at: entry.created_at ?? "",
      user_name: (user as { name?: string })?.name ?? String(meta.user_name ?? "Unknown"),
      from_plan: String(meta.from_plan ?? meta.from ?? "—"),
      to_plan: String(meta.to_plan ?? meta.to ?? "—"),
      trigger: String(meta.trigger ?? "self"),
    };
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RevenuePage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    redirect("/");
  }

  const [kpisResult, distributionResult, pipelineResult, changeLogResult] =
    await Promise.all([
      getRevenueKPIs(),
      getPlanDistribution(),
      getTrialPipeline(),
      getPlanChangeLog(20),
    ]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader title="Revenue & Plans" subtitle="Business health at a glance" actions={<RefreshButton />} />
      <RevenueView
        kpis={adaptKPIs(kpisResult.data)}
        distribution={distributionResult.data ?? []}
        pipeline={adaptPipeline(pipelineResult.data)}
        changeLog={adaptChangeLog(changeLogResult.data)}
      />
    </div>
  );
}
