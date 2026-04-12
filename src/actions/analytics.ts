"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/actions/admin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateCutoff(range: "7d" | "30d" | "90d"): string {
  const d = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Plan prices — mirrors plans.ts to avoid circular imports */
const PLAN_PRICES: Record<string, number> = {
  free: 0,
  professional: 29,
  studio: 69,
  team: 129,
  admin: 0,
};

// ---------------------------------------------------------------------------
// 1. Admin overview KPIs
// ---------------------------------------------------------------------------
export async function getAdminOverviewKPIs(range: "7d" | "30d" | "90d") {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // Total users
    const { count: totalUsers } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    // Active users by plan (for MRR calculation)
    const { data: activeUsers } = await supabase
      .from("users")
      .select("plan")
      .eq("is_active", true);

    const mrr =
      activeUsers?.reduce(
        (sum, u) => sum + (PLAN_PRICES[u.plan] ?? 0),
        0
      ) ?? 0;

    // Active today (last_active_at within 24h)
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();
    const { count: activeToday } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gt("last_active_at", twentyFourHoursAgo);

    // Onboarding rate
    const { count: onboardedCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_completed", true);

    const onboardingRate =
      totalUsers && totalUsers > 0
        ? Math.round(((onboardedCount ?? 0) / totalUsers) * 100)
        : 0;

    // Trial conversion: users whose trial expired (trial_ends_at < now) AND plan != 'free'
    const now = new Date().toISOString();
    const { count: expiredTrialsConverted } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .lt("trial_ends_at", now)
      .neq("plan", "free");

    const { count: totalExpiredTrials } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .lt("trial_ends_at", now)
      .not("trial_ends_at", "is", null);

    const trialConversion =
      totalExpiredTrials && totalExpiredTrials > 0
        ? Math.round(
            ((expiredTrialsConverted ?? 0) / totalExpiredTrials) * 100
          )
        : 0;

    // System health — latest cron_run events, check all succeeded
    const { data: latestCrons } = await supabase
      .from("platform_analytics")
      .select("metadata")
      .eq("event_name", "cron_run")
      .order("created_at", { ascending: false })
      .limit(10);

    const systemOk =
      latestCrons && latestCrons.length > 0
        ? latestCrons.every(
            (e) =>
              (e.metadata as Record<string, unknown>)?.status === "success"
          )
        : true; // no crons yet = ok

    return {
      data: {
        totalUsers: totalUsers ?? 0,
        mrr,
        activeToday: activeToday ?? 0,
        onboardingRate,
        trialConversion,
        systemOk,
      },
    };
  } catch {
    return { error: "Failed to fetch admin overview KPIs" };
  }
}

// ---------------------------------------------------------------------------
// 2. Recent admin activity
// ---------------------------------------------------------------------------
export async function getRecentAdminActivity(limit = 15) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("platform_analytics")
      .select("*, users!platform_analytics_user_id_fkey(name, email)")
      .in("event_name", [
        "signup",
        "plan_changed",
        "admin_action",
        "cron_run",
        "onboarding_step",
      ])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback without join if FK doesn't exist
      const { data: fallback, error: fallbackErr } = await supabase
        .from("platform_analytics")
        .select("*")
        .in("event_name", [
          "signup",
          "plan_changed",
          "admin_action",
          "cron_run",
          "onboarding_step",
        ])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fallbackErr) return { error: "Failed to fetch admin activity" };
      return { data: fallback };
    }

    return { data };
  } catch {
    return { error: "Failed to fetch admin activity" };
  }
}

// ---------------------------------------------------------------------------
// 3. Users needing attention
// ---------------------------------------------------------------------------
export async function getUsersNeedingAttention() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const now = new Date();

    // Trials expiring within 3 days
    const threeDaysFromNow = new Date(
      now.getTime() + 3 * 86400000
    ).toISOString();
    const { data: expiringTrials } = await supabase
      .from("users")
      .select("id, name, email, trial_ends_at, plan")
      .gt("trial_ends_at", now.toISOString())
      .lt("trial_ends_at", threeDaysFromNow)
      .eq("plan", "free");

    // Stuck onboarding (>3 days old, not completed)
    const threeDaysAgo = new Date(
      now.getTime() - 3 * 86400000
    ).toISOString();
    const { data: stuckOnboarding } = await supabase
      .from("users")
      .select("id, name, email, created_at, onboarding_step")
      .eq("onboarding_completed", false)
      .lt("created_at", threeDaysAgo);

    // Inactive 7+ days
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 86400000
    ).toISOString();
    const { data: inactiveUsers } = await supabase
      .from("users")
      .select("id, name, email, last_active_at")
      .lt("last_active_at", sevenDaysAgo)
      .not("last_active_at", "is", null);

    // High bounce: users with bounced count > 5% of total events in last 7 days
    const { data: bounceData } = await supabase
      .from("newsletter_events")
      .select("contact_id, event_type")
      .gt("created_at", sevenDaysAgo);

    const contactBounceMap = new Map<
      string,
      { total: number; bounced: number }
    >();
    for (const evt of bounceData ?? []) {
      const cid = evt.contact_id;
      if (!cid) continue;
      const entry = contactBounceMap.get(cid) ?? { total: 0, bounced: 0 };
      entry.total++;
      if (evt.event_type === "bounced" || evt.event_type === "complained") {
        entry.bounced++;
      }
      contactBounceMap.set(cid, entry);
    }

    const highBounceContactIds: string[] = [];
    for (const [cid, stats] of Array.from(contactBounceMap.entries())) {
      if (stats.total >= 5 && stats.bounced / stats.total > 0.05) {
        highBounceContactIds.push(cid);
      }
    }

    let highBounceContacts: Array<{
      id: string;
      name: string;
      email: string;
    }> = [];
    if (highBounceContactIds.length > 0) {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, name, email")
        .in("id", highBounceContactIds.slice(0, 50));
      highBounceContacts = contacts ?? [];
    }

    return {
      data: {
        expiringTrials: expiringTrials ?? [],
        stuckOnboarding: stuckOnboarding ?? [],
        inactiveUsers: inactiveUsers ?? [],
        highBounceContacts,
      },
    };
  } catch {
    return { error: "Failed to fetch users needing attention" };
  }
}

// ---------------------------------------------------------------------------
// 4. Onboarding funnel
// ---------------------------------------------------------------------------
const ONBOARDING_STEP_LABELS: Record<number, string> = {
  1: "Welcome",
  2: "Profile Setup",
  3: "Import Contacts",
  4: "First Listing",
  5: "Email Setup",
  6: "Calendar Sync",
  7: "Complete",
};

export async function getOnboardingFunnel(range: "7d" | "30d" | "90d") {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const cutoff = getDateCutoff(range);

    // Get all onboarding_step events within range
    const { data: events } = await supabase
      .from("platform_analytics")
      .select("metadata, user_id")
      .eq("event_name", "onboarding_step")
      .gt("created_at", cutoff);

    // Count distinct users per step
    const stepUsers = new Map<number, Set<string>>();
    for (let step = 1; step <= 7; step++) {
      stepUsers.set(step, new Set());
    }

    for (const evt of events ?? []) {
      const step = Number(
        (evt.metadata as Record<string, unknown>)?.step ?? 0
      );
      if (step >= 1 && step <= 7 && evt.user_id) {
        stepUsers.get(step)!.add(evt.user_id);
      }
    }

    const step1Count = stepUsers.get(1)?.size ?? 1; // avoid divide-by-zero
    const funnel = [];

    for (let step = 1; step <= 7; step++) {
      const count = stepUsers.get(step)?.size ?? 0;
      const prevCount =
        step === 1 ? count : stepUsers.get(step - 1)?.size ?? 0;
      funnel.push({
        step,
        label: ONBOARDING_STEP_LABELS[step] ?? `Step ${step}`,
        count,
        percentage: Math.round((count / Math.max(step1Count, 1)) * 100),
        dropoff:
          step === 1
            ? 0
            : prevCount > 0
              ? Math.round(((prevCount - count) / prevCount) * 100)
              : 0,
      });
    }

    return { data: funnel };
  } catch {
    return { error: "Failed to fetch onboarding funnel" };
  }
}

// ---------------------------------------------------------------------------
// 5. Funnel drop-off users
// ---------------------------------------------------------------------------
export async function getFunnelDropoffUsers(
  step: number,
  range: "7d" | "30d" | "90d"
) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const cutoff = getDateCutoff(range);

    if (step < 2 || step > 7) {
      return { error: "Step must be between 2 and 7 (drop-off from previous step)" };
    }

    // Users who have step N-1
    const { data: prevStepEvents } = await supabase
      .from("platform_analytics")
      .select("user_id, metadata")
      .eq("event_name", "onboarding_step")
      .gt("created_at", cutoff);

    const prevStepUsers = new Set<string>();
    const currentStepUsers = new Set<string>();

    for (const evt of prevStepEvents ?? []) {
      const evtStep = Number(
        (evt.metadata as Record<string, unknown>)?.step ?? 0
      );
      if (evtStep === step - 1 && evt.user_id) prevStepUsers.add(evt.user_id);
      if (evtStep === step && evt.user_id) currentStepUsers.add(evt.user_id);
    }

    // Users who have step N-1 but NOT step N
    const droppedUserIds = Array.from(prevStepUsers).filter(
      (uid) => !currentStepUsers.has(uid)
    );

    if (droppedUserIds.length === 0) return { data: [] };

    const { data: users } = await supabase
      .from("users")
      .select("id, name, email, created_at, onboarding_step, last_active_at")
      .in("id", droppedUserIds.slice(0, 50));

    return { data: users ?? [] };
  } catch {
    return { error: "Failed to fetch funnel drop-off users" };
  }
}

// ---------------------------------------------------------------------------
// 6. Feature adoption
// ---------------------------------------------------------------------------
export async function getFeatureAdoption(range: "7d" | "30d" | "90d") {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const cutoff = getDateCutoff(range);

    // Current period
    const { data: currentEvents } = await supabase
      .from("platform_analytics")
      .select("metadata, user_id")
      .eq("event_name", "feature_used")
      .gt("created_at", cutoff);

    // Previous period for trend
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const prevCutoff = new Date();
    prevCutoff.setDate(prevCutoff.getDate() - days * 2);
    const { data: prevEvents } = await supabase
      .from("platform_analytics")
      .select("metadata, user_id")
      .eq("event_name", "feature_used")
      .gt("created_at", prevCutoff.toISOString())
      .lt("created_at", cutoff);

    // Total active users for adoption %
    const { count: totalActive } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    const aggregate = (
      events: typeof currentEvents
    ): Map<string, { users: Set<string>; count: number }> => {
      const map = new Map<string, { users: Set<string>; count: number }>();
      for (const evt of events ?? []) {
        const feature = String(
          (evt.metadata as Record<string, unknown>)?.feature ?? "unknown"
        );
        const entry = map.get(feature) ?? {
          users: new Set<string>(),
          count: 0,
        };
        entry.count++;
        if (evt.user_id) entry.users.add(evt.user_id);
        map.set(feature, entry);
      }
      return map;
    };

    const current = aggregate(currentEvents);
    const previous = aggregate(prevEvents);
    const activeCount = totalActive ?? 1;

    const features = [];
    for (const [feature, stats] of Array.from(current.entries())) {
      const prevStats = previous.get(feature);
      const prevUserCount = prevStats?.users.size ?? 0;
      const trend =
        prevUserCount > 0
          ? Math.round(
              ((stats.users.size - prevUserCount) / prevUserCount) * 100
            )
          : stats.users.size > 0
            ? 100
            : 0;

      features.push({
        feature,
        uniqueUsers: stats.users.size,
        totalEvents: stats.count,
        adoptionPercent: Math.round(
          (stats.users.size / activeCount) * 100
        ),
        trend,
      });
    }

    // Sort by unique users descending
    features.sort((a, b) => b.uniqueUsers - a.uniqueUsers);

    return { data: features };
  } catch {
    return { error: "Failed to fetch feature adoption" };
  }
}

// ---------------------------------------------------------------------------
// 7. Revenue KPIs
// ---------------------------------------------------------------------------
export async function getRevenueKPIs() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // All active users with plans
    const { data: activeUsers } = await supabase
      .from("users")
      .select("plan, is_active")
      .eq("is_active", true);

    const mrr =
      activeUsers?.reduce(
        (sum, u) => sum + (PLAN_PRICES[u.plan] ?? 0),
        0
      ) ?? 0;

    const payingUsers =
      activeUsers?.filter((u) => (PLAN_PRICES[u.plan] ?? 0) > 0).length ?? 0;

    const arpu = payingUsers > 0 ? Math.round((mrr / payingUsers) * 100) / 100 : 0;

    // Trial conversion
    const now = new Date().toISOString();
    const { count: expiredConverted } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .lt("trial_ends_at", now)
      .neq("plan", "free")
      .not("trial_ends_at", "is", null);

    const { count: totalExpired } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .lt("trial_ends_at", now)
      .not("trial_ends_at", "is", null);

    const trialConversionRate =
      totalExpired && totalExpired > 0
        ? Math.round(((expiredConverted ?? 0) / totalExpired) * 100)
        : 0;

    // Churn rate (30d): users who became inactive in last 30 days
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 86400000
    ).toISOString();
    const { count: churned } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false)
      .gt("last_active_at", thirtyDaysAgo);

    const { count: totalWithActivity } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .not("last_active_at", "is", null);

    const churnRate =
      totalWithActivity && totalWithActivity > 0
        ? Math.round(((churned ?? 0) / totalWithActivity) * 100)
        : 0;

    return {
      data: {
        mrr,
        arr: mrr * 12,
        arpu,
        payingUsers,
        trialConversionRate,
        churnRate,
      },
    };
  } catch {
    return { error: "Failed to fetch revenue KPIs" };
  }
}

// ---------------------------------------------------------------------------
// 8. Plan distribution
// ---------------------------------------------------------------------------
export async function getPlanDistribution() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data: users } = await supabase
      .from("users")
      .select("plan")
      .eq("is_active", true);

    if (!users) return { data: [] };

    const planCounts = new Map<string, number>();
    for (const u of users) {
      planCounts.set(u.plan, (planCounts.get(u.plan) ?? 0) + 1);
    }

    const distribution = [];
    for (const [plan, count] of Array.from(planCounts.entries())) {
      distribution.push({
        plan,
        count,
        mrr: count * (PLAN_PRICES[plan] ?? 0),
        percentage: Math.round((count / users.length) * 100),
      });
    }

    // Sort by MRR descending
    distribution.sort((a, b) => b.mrr - a.mrr);

    return { data: distribution };
  } catch {
    return { error: "Failed to fetch plan distribution" };
  }
}

// ---------------------------------------------------------------------------
// 9. Trial pipeline
// ---------------------------------------------------------------------------
export async function getTrialPipeline() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const now = new Date();
    const nowISO = now.toISOString();
    const threeDaysFromNow = new Date(
      now.getTime() + 3 * 86400000
    ).toISOString();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 86400000
    ).toISOString();

    // Active trials (trial_ends_at > now)
    const { data: activeTrials } = await supabase
      .from("users")
      .select("id, name, email, trial_plan, trial_ends_at, plan, created_at")
      .gt("trial_ends_at", nowISO)
      .not("trial_ends_at", "is", null);

    // Expiring soon (within 3 days)
    const expiringSoon =
      activeTrials?.filter(
        (u) =>
          u.trial_ends_at &&
          new Date(u.trial_ends_at) <= new Date(threeDaysFromNow)
      ) ?? [];

    // Converted in last 30 days (trial expired, plan != free)
    const { count: convertedCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .lt("trial_ends_at", nowISO)
      .gt("trial_ends_at", thirtyDaysAgo)
      .neq("plan", "free")
      .not("trial_ends_at", "is", null);

    // Churned in last 30 days (trial expired, plan = free)
    const { count: churnedCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .lt("trial_ends_at", nowISO)
      .gt("trial_ends_at", thirtyDaysAgo)
      .eq("plan", "free")
      .not("trial_ends_at", "is", null);

    return {
      data: {
        activeTrials: activeTrials ?? [],
        activeCount: activeTrials?.length ?? 0,
        expiringSoon,
        expiringSoonCount: expiringSoon.length,
        convertedLast30d: convertedCount ?? 0,
        churnedLast30d: churnedCount ?? 0,
      },
    };
  } catch {
    return { error: "Failed to fetch trial pipeline" };
  }
}

// ---------------------------------------------------------------------------
// 10. Plan change log
// ---------------------------------------------------------------------------
export async function getPlanChangeLog(limit = 20) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("platform_analytics")
      .select("*, users!platform_analytics_user_id_fkey(name, email)")
      .eq("event_name", "plan_changed")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback without join
      const { data: fallback, error: fbErr } = await supabase
        .from("platform_analytics")
        .select("*")
        .eq("event_name", "plan_changed")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fbErr) return { error: "Failed to fetch plan change log" };
      return { data: fallback };
    }

    return { data };
  } catch {
    return { error: "Failed to fetch plan change log" };
  }
}

// ---------------------------------------------------------------------------
// 11. System health
// ---------------------------------------------------------------------------
export async function getSystemHealth() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // Get all cron_run events, then pick the latest per cron name
    const { data: cronEvents } = await supabase
      .from("platform_analytics")
      .select("metadata, created_at")
      .eq("event_name", "cron_run")
      .order("created_at", { ascending: false })
      .limit(200);

    const latestPerCron = new Map<
      string,
      {
        cron: string;
        lastRun: string;
        status: string;
        duration: number | null;
      }
    >();

    for (const evt of cronEvents ?? []) {
      const meta = evt.metadata as Record<string, unknown>;
      const cronName = String(meta?.cron ?? "unknown");

      if (!latestPerCron.has(cronName)) {
        latestPerCron.set(cronName, {
          cron: cronName,
          lastRun: evt.created_at,
          status: String(meta?.status ?? "unknown"),
          duration:
            typeof meta?.duration_ms === "number"
              ? meta.duration_ms
              : null,
        });
      }
    }

    return { data: Array.from(latestPerCron.values()) };
  } catch {
    return { error: "Failed to fetch system health" };
  }
}

// ---------------------------------------------------------------------------
// 12. Cron history
// ---------------------------------------------------------------------------
export async function getCronHistory(cronName: string, limit = 10) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // Fetch cron_run events filtered by cron name in metadata
    const { data: allEvents } = await supabase
      .from("platform_analytics")
      .select("*")
      .eq("event_name", "cron_run")
      .order("created_at", { ascending: false })
      .limit(500);

    // Filter by cron name in metadata (Supabase JS doesn't support JSONB -> operator in .eq for metadata)
    const filtered =
      allEvents?.filter(
        (evt) =>
          (evt.metadata as Record<string, unknown>)?.cron === cronName
      ) ?? [];

    return { data: filtered.slice(0, limit) };
  } catch {
    return { error: "Failed to fetch cron history" };
  }
}

// ---------------------------------------------------------------------------
// 13. Trigger cron
// ---------------------------------------------------------------------------
const ALLOWED_CRONS = [
  "process-workflows",
  "daily-digest",
  "consent-expiry",
  "trial-expiry",
];

export async function triggerCron(cronName: string) {
  try {
    const session = await requireAdmin();

    if (!ALLOWED_CRONS.includes(cronName)) {
      return { error: `Cron '${cronName}' is not in the allowlist` };
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return { error: "CRON_SECRET not configured" };

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const res = await fetch(`${appUrl}/api/cron/${cronName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        error: `Cron '${cronName}' returned ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const { trackEvent } = await import("@/lib/analytics");
    await trackEvent("admin_action", session.user.id ?? null, {
      action: "trigger_cron",
      cron: cronName,
      status: "triggered",
    });

    return { success: true, status: res.status };
  } catch {
    return { error: "Failed to trigger cron" };
  }
}

// ---------------------------------------------------------------------------
// 14. Audit log (admin_action events only)
// ---------------------------------------------------------------------------
export async function getAuditLog(limit = 20) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("platform_analytics")
      .select("*, users!platform_analytics_user_id_fkey(name, email)")
      .eq("event_name", "admin_action")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback without join if FK doesn't exist
      const { data: fallback, error: fbErr } = await supabase
        .from("platform_analytics")
        .select("*")
        .eq("event_name", "admin_action")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (fbErr) return { error: "Failed to fetch audit log" };
      return { data: fallback };
    }

    return { data };
  } catch {
    return { error: "Failed to fetch audit log" };
  }
}

// ---------------------------------------------------------------------------
// 15. Email ops KPIs
// ---------------------------------------------------------------------------
export async function getEmailOpsKPIs(range: "7d" | "30d" | "90d") {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const cutoff = getDateCutoff(range);

    // Count events by type from newsletter_events
    const { data: events } = await supabase
      .from("newsletter_events")
      .select("event_type")
      .gt("created_at", cutoff);

    const counts: Record<string, number> = {
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
    };

    for (const evt of events ?? []) {
      const t = evt.event_type;
      if (t in counts) {
        counts[t]++;
      }
    }

    // Sent count from newsletters table
    const { count: sentCount } = await supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gt("created_at", cutoff);

    return {
      data: {
        sent: sentCount ?? 0,
        delivered: counts.delivered,
        opened: counts.opened,
        clicked: counts.clicked,
        bounced: counts.bounced,
        complained: counts.complained,
      },
    };
  } catch {
    return { error: "Failed to fetch email ops KPIs" };
  }
}

// ---------------------------------------------------------------------------
// 15. Per-user email stats
// ---------------------------------------------------------------------------
export async function getPerUserEmailStats(range: "7d" | "30d" | "90d") {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const cutoff = getDateCutoff(range);

    // Get newsletters with their events
    const { data: newsletters } = await supabase
      .from("newsletters")
      .select("id, realtor_id")
      .gt("created_at", cutoff);

    if (!newsletters || newsletters.length === 0) return { data: [] };

    const newsletterIds = newsletters.map((n) => n.id);
    const newsletterToRealtor = new Map<string, string>();
    for (const n of newsletters) {
      if (n.realtor_id) newsletterToRealtor.set(n.id, n.realtor_id);
    }

    // Get events for these newsletters
    const { data: events } = await supabase
      .from("newsletter_events")
      .select("newsletter_id, event_type")
      .in("newsletter_id", newsletterIds.slice(0, 500));

    // Aggregate per realtor
    const stats = new Map<
      string,
      { sent: number; delivered: number; opened: number; bounced: number }
    >();

    // Count sent per realtor
    for (const n of newsletters) {
      if (!n.realtor_id) continue;
      const entry = stats.get(n.realtor_id) ?? {
        sent: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
      };
      entry.sent++;
      stats.set(n.realtor_id, entry);
    }

    // Count events per realtor
    for (const evt of events ?? []) {
      const realtorId = evt.newsletter_id
        ? newsletterToRealtor.get(evt.newsletter_id)
        : null;
      if (!realtorId) continue;

      const entry = stats.get(realtorId) ?? {
        sent: 0,
        delivered: 0,
        opened: 0,
        bounced: 0,
      };

      if (evt.event_type === "delivered") entry.delivered++;
      else if (evt.event_type === "opened") entry.opened++;
      else if (
        evt.event_type === "bounced" ||
        evt.event_type === "complained"
      )
        entry.bounced++;

      stats.set(realtorId, entry);
    }

    // Get user names
    const realtorIds = Array.from(stats.keys());
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", realtorIds.slice(0, 100));

    const userMap = new Map<string, { name: string; email: string }>();
    for (const u of users ?? []) {
      userMap.set(u.id, { name: u.name ?? "", email: u.email ?? "" });
    }

    const result = [];
    for (const [realtorId, s] of Array.from(stats.entries())) {
      const user = userMap.get(realtorId);
      result.push({
        realtorId,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
        sent: s.sent,
        delivered: s.delivered,
        openRate:
          s.delivered > 0
            ? Math.round((s.opened / s.delivered) * 100)
            : 0,
        bounceRate:
          s.sent > 0 ? Math.round((s.bounced / s.sent) * 100) : 0,
      });
    }

    result.sort((a, b) => b.sent - a.sent);

    return { data: result };
  } catch {
    return { error: "Failed to fetch per-user email stats" };
  }
}

// ---------------------------------------------------------------------------
// 16. Per-user email detail (individual emails sent by a user)
// ---------------------------------------------------------------------------
export async function getUserEmailDetail(userId: string) {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // Get newsletters sent by this user with engagement counts
    const { data: newsletters, error: nlErr } = await supabase
      .from("newsletters")
      .select("id, subject, template_type, status, created_at, sent_at")
      .eq("realtor_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (nlErr || !newsletters) return { data: [] };
    if (newsletters.length === 0) return { data: [] };

    const newsletterIds = newsletters.map((n) => n.id);

    // Get all events for these newsletters
    const { data: events } = await supabase
      .from("newsletter_events")
      .select("newsletter_id, event_type")
      .in("newsletter_id", newsletterIds);

    // Aggregate events per newsletter
    const eventMap = new Map<
      string,
      { delivered: number; opened: number; clicked: number; bounced: number; recipients: number }
    >();

    for (const evt of events ?? []) {
      if (!evt.newsletter_id) continue;
      const entry = eventMap.get(evt.newsletter_id) ?? {
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        recipients: 0,
      };
      if (evt.event_type === "delivered") {
        entry.delivered++;
        entry.recipients++;
      } else if (evt.event_type === "opened") {
        entry.opened++;
      } else if (evt.event_type === "clicked") {
        entry.clicked++;
      } else if (evt.event_type === "bounced" || evt.event_type === "complained") {
        entry.bounced++;
        entry.recipients++;
      }
      eventMap.set(evt.newsletter_id, entry);
    }

    const result = newsletters.map((nl) => {
      const stats = eventMap.get(nl.id);
      return {
        id: nl.id,
        subject: nl.subject ?? "(No subject)",
        templateType: nl.template_type ?? "custom",
        status: nl.status,
        sentAt: nl.sent_at ?? nl.created_at,
        recipients: stats?.recipients ?? 0,
        delivered: stats?.delivered ?? 0,
        opened: stats?.opened ?? 0,
        clicked: stats?.clicked ?? 0,
        bounced: stats?.bounced ?? 0,
      };
    });

    return { data: result };
  } catch {
    return { error: "Failed to fetch user email detail" };
  }
}

// ---------------------------------------------------------------------------
// 17. Bounce log
// ---------------------------------------------------------------------------
export async function getBounceLog(range: "7d" | "30d" | "90d") {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const cutoff = getDateCutoff(range);

    // Get bounced/complained events
    const { data: events } = await supabase
      .from("newsletter_events")
      .select("*, contacts(name, email), newsletters(subject, realtor_id)")
      .in("event_type", ["bounced", "complained"])
      .gt("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!events) {
      // Fallback without joins
      const { data: fallback, error: fbErr } = await supabase
        .from("newsletter_events")
        .select("*")
        .in("event_type", ["bounced", "complained"])
        .gt("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(100);

      if (fbErr) return { error: "Failed to fetch bounce log" };
      return { data: fallback };
    }

    return { data: events };
  } catch {
    return { error: "Failed to fetch bounce log" };
  }
}
