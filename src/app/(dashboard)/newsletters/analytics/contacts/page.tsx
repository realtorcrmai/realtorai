"use no memo";

export const dynamic = "force-dynamic";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function ContactEngagementPage() {
  const tc = await getAuthenticatedTenantClient();
  const now = Date.now();
  const ninetyDaysAgoISO = new Date(now - 90 * 86400000).toISOString();

  // Fetch all contacts with email intelligence, plus recent event counts
  const [{ data: contacts }, { data: recentEvents }] = await Promise.all([
    tc.from("contacts")
      .select("id, name, email, type, newsletter_intelligence, newsletter_unsubscribed")
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),

    // Events in last 90 days for trend calculation
    tc.from("newsletter_events")
      .select("contact_id, event_type, created_at")
      .gte("created_at", ninetyDaysAgoISO),
  ]);

  // Build event counts per contact for last 30 / 60-90 days (for trend)
  const thirtyDaysAgo = now - 30 * 86400000;
  const sixtyDaysAgo = now - 60 * 86400000;

  const recent30: Record<string, number> = {};
  const prev30to60: Record<string, number> = {};

  for (const ev of recentEvents ?? []) {
    const evTime = new Date(ev.created_at).getTime();
    if (evTime >= thirtyDaysAgo) {
      recent30[ev.contact_id] = (recent30[ev.contact_id] || 0) + 1;
    } else if (evTime >= sixtyDaysAgo) {
      prev30to60[ev.contact_id] = (prev30to60[ev.contact_id] || 0) + 1;
    }
  }

  // Build ranked list
  const ranked = (contacts ?? [])
    .map((c: any) => {
      const intel = c.newsletter_intelligence || {};
      const score = intel.engagement_score ?? 0;
      const totalOpens = intel.total_opens ?? 0;
      const totalClicks = intel.total_clicks ?? 0;
      const lastOpened = intel.last_opened ?? null;
      const trustLevel = intel.trust_level ?? "L0";

      // Trend: compare last 30 days activity vs previous 30 days
      const recentActivity = recent30[c.id] || 0;
      const prevActivity = prev30to60[c.id] || 0;
      let trend: "up" | "down" | "stable" = "stable";
      if (recentActivity > prevActivity + 1) trend = "up";
      else if (recentActivity < prevActivity - 1) trend = "down";

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        type: c.type,
        unsubscribed: c.newsletter_unsubscribed,
        score,
        totalOpens,
        totalClicks,
        lastOpened,
        trustLevel,
        trend,
      };
    })
    .sort((a: any, b: any) => b.score - a.score);

  // Stats
  const totalContacts = ranked.length;
  const engagedCount = ranked.filter((c: any) => c.score > 0).length;
  const highEngaged = ranked.filter((c: any) => c.score >= 60).length;
  const unsubscribedCount = ranked.filter((c: any) => c.unsubscribed).length;

  return (
    <>
      <PageHeader
        title="Contact Engagement"
        subtitle={`${totalContacts} contacts ranked by engagement score`}
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
          { label: "Analytics", href: "/newsletters/analytics" },
          { label: "Contacts" },
        ]}
        actions={
          <a
            href="/newsletters/analytics"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            &larr; Back to Analytics
          </a>
        }
      />
      <div className="p-6 space-y-6">
        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon="👥" label="Total Contacts" value={totalContacts} />
          <SummaryCard icon="📊" label="With Engagement" value={engagedCount} />
          <SummaryCard icon="🔥" label="High Engaged (60+)" value={highEngaged} />
          <SummaryCard icon="📭" label="Unsubscribed" value={unsubscribedCount} />
        </div>

        {/* ── Leaderboard Table ── */}
        {ranked.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground">No contacts with email addresses found.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-10">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Email</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Type</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trust</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Score</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Opens</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Clicks</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Last Opened</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c: any, idx: number) => (
                    <tr
                      key={c.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${c.unsubscribed ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {idx + 1 <= 3 ? (
                          <span className="text-base">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <a
                          href={`/contacts/${c.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {c.name}
                        </a>
                        {c.unsubscribed && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                            unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">
                        {c.email}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          c.type === "buyer" ? "bg-blue-100 text-blue-700" :
                          c.type === "seller" ? "bg-purple-100 text-purple-700" :
                          "bg-zinc-100 text-zinc-600"
                        }`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <TrustBadge level={c.trustLevel} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <ScoreBadge score={c.score} />
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs">{c.totalOpens}</td>
                      <td className="px-4 py-2.5 text-center text-xs font-medium">{c.totalClicks}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {c.lastOpened
                          ? formatDate(c.lastOpened)
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <TrendIndicator trend={c.trend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Helper Components ── */

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700"
      : score >= 40
        ? "bg-amber-100 text-amber-700"
        : score > 0
          ? "bg-zinc-100 text-zinc-600"
          : "bg-zinc-50 text-zinc-400";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {score}
    </span>
  );
}

function TrustBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; color: string }> = {
    L0: { label: "L0", color: "bg-zinc-100 text-zinc-600" },
    L1: { label: "L1", color: "bg-blue-100 text-blue-700" },
    L2: { label: "L2", color: "bg-amber-100 text-amber-700" },
    L3: { label: "L3", color: "bg-emerald-100 text-emerald-700" },
  };
  const c = config[level] ?? config.L0;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${c.color}`}>
      {c.label}
    </span>
  );
}

function TrendIndicator({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") {
    return <span className="text-emerald-600 text-xs font-bold" title="Engagement increasing">↑</span>;
  }
  if (trend === "down") {
    return <span className="text-red-500 text-xs font-bold" title="Engagement decreasing">↓</span>;
  }
  return <span className="text-muted-foreground text-xs" title="Stable engagement">→</span>;
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
