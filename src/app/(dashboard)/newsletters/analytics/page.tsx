export const dynamic = "force-dynamic";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { PageHeader } from "@/components/layout/PageHeader";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  new_listing_alert: "Listing Alerts",
  market_update: "Market Updates",
  just_sold: "Just Sold",
  open_house_invite: "Open House",
  neighbourhood_guide: "Neighbourhood Guide",
  home_anniversary: "Home Anniversary",
  welcome: "Welcome",
  reengagement: "Re-engagement",
  referral_ask: "Referral Ask",
  price_drop_alert: "Price Drop Alert",
  buyer_guide: "Buyer Guide",
  premium_listing: "Premium Listing",
  closing_reminder: "Closing Reminder",
  community_event: "Community Event",
  custom: "Custom",
};

const CLICK_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  book_showing: { label: "Book a Showing", icon: "🏠" },
  get_cma: { label: "Get a CMA", icon: "📊" },
  mortgage_calc: { label: "Mortgage Calculator", icon: "🏦" },
  listing: { label: "View Listing", icon: "📋" },
  investment: { label: "Investment Info", icon: "💰" },
  open_house_rsvp: { label: "Open House RSVP", icon: "📅" },
  school_info: { label: "School Info", icon: "🎓" },
  market_stats: { label: "Market Stats", icon: "📈" },
  neighbourhood: { label: "Neighbourhood", icon: "🏘️" },
  price_drop: { label: "Price Drop", icon: "🔻" },
  forwarded: { label: "Forwarded / Shared", icon: "📤" },
  contact_agent: { label: "Contact Agent", icon: "📞" },
  unsubscribe: { label: "Unsubscribe", icon: "🚫" },
  other: { label: "Other Links", icon: "🔗" },
};

function getThirtyDaysAgo() {
  return new Date(Date.now() - 30 * 86400000).toISOString();
}

export default async function NewsletterAnalyticsPage() {
  const tc = await getAuthenticatedTenantClient();
  const thirtyDaysAgo = getThirtyDaysAgo();

  const [
    { data: sentNewsletters },
    { data: allEvents },
    { data: agentRuns },
    { data: contactsWithIntel },
    { data: allContacts },
    { data: suppressedContacts },
    { data: unsubscribedContacts },
    { data: noEmailContacts },
    { data: recentEvents },
    { data: abTests },
  ] = await Promise.all([
    // Sent newsletters in last 30 days
    tc.from("newsletters")
      .select("id, email_type, status, sent_at, contact_id, subject")
      .eq("status", "sent")
      .gte("sent_at", thirtyDaysAgo)
      .order("sent_at", { ascending: false }),

    // All events in last 30 days
    tc.from("newsletter_events")
      .select("id, newsletter_id, contact_id, event_type, link_type, link_url, metadata, created_at")
      .gte("created_at", thirtyDaysAgo),

    // Agent runs for cost calculation
    tc.from("agent_runs")
      .select("estimated_cost_usd")
      .gte("created_at", thirtyDaysAgo),

    // Contacts with newsletter intelligence (for top engaged)
    tc.from("contacts")
      .select("id, name, email, type, newsletter_intelligence")
      .not("newsletter_intelligence", "is", null)
      .order("created_at", { ascending: false })
      .limit(100),

    // Total active contacts
    tc.from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("newsletter_unsubscribed", false),

    // Suppressed count
    tc.from("contact_suppressions")
      .select("id", { count: "exact", head: true }),

    // Unsubscribed count
    tc.from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("newsletter_unsubscribed", true),

    // Contacts with no email
    tc.from("contacts")
      .select("id", { count: "exact", head: true })
      .is("email", null),

    // Recent events with contact + newsletter info (last 20)
    tc.from("newsletter_events")
      .select("id, event_type, link_type, link_url, created_at, contact_id, newsletter_id, contacts(name), newsletters(subject)")
      .order("created_at", { ascending: false })
      .limit(20),

    // A/B tests
    tc.from("agent_ab_tests")
      .select("id, variant_a_subject, variant_b_subject, selected_variant, open_result")
      .gte("created_at", thirtyDaysAgo),
  ]);

  // ── KPI calculations ──
  const newsletters = sentNewsletters ?? [];
  const events = allEvents ?? [];
  const totalSent = newsletters.length;

  const uniqueOpens = new Set(
    events.filter((e: any) => e.event_type === "opened").map((e: any) => e.newsletter_id)
  ).size;
  const uniqueClicks = new Set(
    events.filter((e: any) => e.event_type === "clicked").map((e: any) => e.newsletter_id)
  ).size;
  const totalBounces = events.filter((e: any) => e.event_type === "bounced").length;
  const totalUnsubscribes = events.filter((e: any) => e.event_type === "unsubscribed").length;

  const openRate = totalSent > 0 ? Math.round((uniqueOpens / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((uniqueClicks / totalSent) * 100) : 0;
  const bounceRate = totalSent > 0 ? Math.round((totalBounces / totalSent) * 100) : 0;

  const totalCost = (agentRuns ?? []).reduce(
    (sum: number, r: any) => sum + (parseFloat(r.estimated_cost_usd) || 0),
    0
  );
  const avgCostPerEmail = totalSent > 0 ? (totalCost / totalSent) : 0;

  // ── Performance by email type ──
  const byType: Record<string, { sent: number; opens: number; clicks: number; bestSubject: string; bestClicks: number }> = {};
  const newsletterMap = new Map<string, any>();
  for (const n of newsletters) {
    newsletterMap.set(n.id, n);
    const t = n.email_type;
    if (!byType[t]) byType[t] = { sent: 0, opens: 0, clicks: 0, bestSubject: "", bestClicks: 0 };
    byType[t].sent++;
  }

  // Track per-newsletter click count for best performer
  const clicksByNewsletter: Record<string, number> = {};
  for (const e of events) {
    const nl = newsletterMap.get(e.newsletter_id);
    if (!nl) continue;
    const t = nl.email_type;
    if (!byType[t]) continue;
    if (e.event_type === "opened") byType[t].opens++;
    if (e.event_type === "clicked") {
      byType[t].clicks++;
      clicksByNewsletter[e.newsletter_id] = (clicksByNewsletter[e.newsletter_id] || 0) + 1;
    }
  }

  // Find best performer per type
  for (const [nlId, clickCount] of Object.entries(clicksByNewsletter)) {
    const nl = newsletterMap.get(nlId);
    if (!nl) continue;
    const t = nl.email_type;
    if (byType[t] && clickCount > byType[t].bestClicks) {
      byType[t].bestClicks = clickCount;
      byType[t].bestSubject = nl.subject;
    }
  }

  // Find the overall best type
  let bestTypeKey = "";
  let bestTypeCtr = -1;
  for (const [key, val] of Object.entries(byType)) {
    const ctr = val.sent > 0 ? val.clicks / val.sent : 0;
    if (ctr > bestTypeCtr) {
      bestTypeCtr = ctr;
      bestTypeKey = key;
    }
  }

  // ── Click categories ──
  const clickEvents = events.filter((e: any) => e.event_type === "clicked");
  const clickByType: Record<string, number> = {};
  for (const e of clickEvents) {
    const lt = e.link_type || "other";
    clickByType[lt] = (clickByType[lt] || 0) + 1;
  }
  const totalClicks = clickEvents.length;
  const sortedClicks = Object.entries(clickByType).sort((a, b) => b[1] - a[1]);

  // ── Top engaged contacts ──
  const engagedContacts = (contactsWithIntel ?? [])
    .map((c: any) => {
      const intel = c.newsletter_intelligence || {};
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        type: c.type,
        score: intel.engagement_score ?? 0,
        totalOpens: intel.total_opens ?? 0,
        totalClicks: intel.total_clicks ?? 0,
        trustLevel: intel.trust_level ?? "L0",
      };
    })
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

  // ── List health ──
  const activeCount = (allContacts as any) ?? 0;
  const suppressedCount = (suppressedContacts as any) ?? 0;
  const unsubscribedCount = (unsubscribedContacts as any) ?? 0;
  const noEmailCount = (noEmailContacts as any) ?? 0;

  // ── A/B test summary ──
  const abTestCount = (abTests ?? []).length;
  const abVariantAWins = (abTests ?? []).filter((t: any) => {
    const result = t.open_result;
    return result && result.winner === "a";
  }).length;
  const abVariantBWins = (abTests ?? []).filter((t: any) => {
    const result = t.open_result;
    return result && result.winner === "b";
  }).length;

  // ── Recent activity ──
  const recentActivityItems = (recentEvents ?? []).map((ev: any) => {
    const contact = Array.isArray(ev.contacts) ? ev.contacts[0] : ev.contacts;
    const newsletter = Array.isArray(ev.newsletters) ? ev.newsletters[0] : ev.newsletters;
    return {
      id: ev.id,
      eventType: ev.event_type,
      contactName: contact?.name ?? "Unknown",
      contactId: ev.contact_id,
      subject: newsletter?.subject ?? "",
      newsletterId: ev.newsletter_id,
      linkType: ev.link_type,
      linkUrl: ev.link_url,
      createdAt: ev.created_at,
    };
  });

  return (
    <>
      <PageHeader
        title="Email Analytics"
        subtitle="Comprehensive performance data from the last 30 days"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
          { label: "Analytics" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/newsletters/analytics/contacts"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              👥 Contact Leaderboard
            </a>
            <a
              href="/newsletters"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              &larr; Back to Email Marketing
            </a>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard icon="📧" label="Total Sent" value={totalSent} sublabel="last 30 days" />
          <KpiCard
            icon="📬"
            label="Open Rate"
            value={`${openRate}%`}
            sublabel={`${uniqueOpens} unique opens`}
            color={openRate >= 25 ? "green" : openRate >= 10 ? "amber" : "red"}
          />
          <KpiCard
            icon="🖱️"
            label="Click Rate"
            value={`${clickRate}%`}
            sublabel={`${uniqueClicks} unique clicks`}
            color={clickRate >= 10 ? "green" : clickRate >= 3 ? "amber" : "red"}
          />
          <KpiCard
            icon="🚫"
            label="Bounce Rate"
            value={`${bounceRate}%`}
            sublabel={`${totalBounces} bounces`}
            color={bounceRate <= 2 ? "green" : bounceRate <= 5 ? "amber" : "red"}
          />
          <KpiCard icon="📭" label="Unsubscribes" value={totalUnsubscribes} sublabel="in period" />
          <KpiCard icon="💰" label="Avg Cost/Email" value={`$${avgCostPerEmail.toFixed(4)}`} sublabel="AI agent cost" />
        </div>

        {/* ── Performance by Email Type ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            📊 Performance by Email Type
          </h2>
          {Object.keys(byType).length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">No data yet. Send some emails to see performance breakdown.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Email Type</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Sent</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Open Rate</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Click Rate</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Best Performer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byType)
                      .sort((a, b) => b[1].sent - a[1].sent)
                      .map(([type, data]) => {
                        const or = data.sent > 0 ? Math.round((data.opens / data.sent) * 100) : 0;
                        const cr = data.sent > 0 ? Math.round((data.clicks / data.sent) * 100) : 0;
                        const isBest = type === bestTypeKey;
                        return (
                          <tr
                            key={type}
                            className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${isBest ? "bg-emerald-50/50" : ""}`}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {EMAIL_TYPE_LABELS[type] || type}
                                </span>
                                {isBest && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-semibold">
                                    TOP
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground">{data.sent}</td>
                            <td className="px-4 py-2.5 text-center">
                              <RateDisplay value={or} goodThreshold={25} badThreshold={10} />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <RateDisplay value={cr} goodThreshold={10} badThreshold={3} />
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                              {data.bestSubject ? (
                                <span title={data.bestSubject}>
                                  {data.bestSubject.length > 40
                                    ? data.bestSubject.slice(0, 37) + "..."
                                    : data.bestSubject}
                                  {" "}({data.bestClicks} clicks)
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── Click Categories + A/B Tests row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Click Categories */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              🖱️ Click Categories
            </h2>
            {sortedClicks.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                {sortedClicks.map(([type, count]) => {
                  const pct = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0;
                  const info = CLICK_TYPE_LABELS[type] || { label: type, icon: "🔗" };
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-base shrink-0">{info.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{info.label}</span>
                          <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* A/B Testing Summary */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              🧪 A/B Testing Summary
            </h2>
            <div className="bg-card border border-border rounded-lg p-4">
              {abTestCount === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No A/B tests run yet. The agent optimizes subject lines automatically.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tests Run</span>
                    <span className="text-lg font-bold text-foreground">{abTestCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Variant A Wins</span>
                    <span className="text-lg font-bold text-foreground">{abVariantAWins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Variant B Wins</span>
                    <span className="text-lg font-bold text-foreground">{abVariantBWins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Inconclusive</span>
                    <span className="text-lg font-bold text-muted-foreground">{abTestCount - abVariantAWins - abVariantBWins}</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Top Engaged Contacts ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              🏆 Top Engaged Contacts
            </h2>
            <a
              href="/newsletters/analytics/contacts"
              className="text-xs text-primary font-medium hover:underline"
            >
              View All →
            </a>
          </div>
          {engagedContacts.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">No engagement data yet. Contacts will appear after they interact with your emails.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Contact</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Score</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Opens</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Clicks</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagedContacts.map((c: any, idx: number) => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <a href={`/contacts/${c.id}`} className="text-xs font-medium text-primary hover:underline">
                            {c.name}
                          </a>
                          <span className="ml-2 text-[10px] text-muted-foreground capitalize">{c.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <ScoreBadge score={c.score} />
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs">{c.totalOpens}</td>
                        <td className="px-4 py-2.5 text-center text-xs">{c.totalClicks}</td>
                        <td className="px-4 py-2.5 text-center">
                          <TrustBadge level={c.trustLevel} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── List Health ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            🩺 List Health
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HealthCard icon="✅" label="Active Contacts" value={activeCount} color="bg-emerald-50 text-emerald-700 border-emerald-200" />
            <HealthCard icon="🛑" label="Suppressed" value={suppressedCount} color={suppressedCount > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"} />
            <HealthCard icon="📭" label="Unsubscribed" value={unsubscribedCount} color={unsubscribedCount > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"} />
            <HealthCard icon="❌" label="No Email" value={noEmailCount} color={noEmailCount > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-600 border-zinc-200"} />
          </div>
        </section>

        {/* ── Recent Activity ── */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            ⚡ Recent Activity
          </h2>
          {recentActivityItems.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">No recent email activity.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Time</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Contact</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Event</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivityItems.map((item: any) => (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(item.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <a href={`/contacts/${item.contactId}`} className="text-xs font-medium text-primary hover:underline">
                            {item.contactName}
                          </a>
                        </td>
                        <td className="px-4 py-2.5">
                          <EventBadge type={item.eventType} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                          <a
                            href={`/newsletters/analytics/${item.newsletterId}`}
                            className="hover:text-foreground hover:underline"
                            title={item.subject}
                          >
                            {item.subject
                              ? item.subject.length > 35
                                ? item.subject.slice(0, 32) + "..."
                                : item.subject
                              : "-"}
                          </a>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {item.linkType ? (
                            <span className="inline-flex items-center gap-1">
                              {CLICK_TYPE_LABELS[item.linkType]?.icon || "🔗"}
                              {" "}{CLICK_TYPE_LABELS[item.linkType]?.label || item.linkType}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* ── Helper Components ── */

function KpiCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: "green" | "amber" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-emerald-600"
      : color === "amber"
        ? "text-amber-600"
        : color === "red"
          ? "text-red-600"
          : "text-foreground";

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {sublabel && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}

function HealthCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function RateDisplay({
  value,
  goodThreshold,
  badThreshold,
}: {
  value: number;
  goodThreshold: number;
  badThreshold: number;
}) {
  const color =
    value >= goodThreshold
      ? "text-emerald-600 font-semibold"
      : value >= badThreshold
        ? "text-amber-600 font-medium"
        : "text-red-500 font-medium";
  return <span className={`text-xs ${color}`}>{value}%</span>;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700"
      : score >= 40
        ? "bg-amber-100 text-amber-700"
        : "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {score}
    </span>
  );
}

function TrustBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; color: string }> = {
    L0: { label: "L0 New", color: "bg-zinc-100 text-zinc-600" },
    L1: { label: "L1 Proven", color: "bg-blue-100 text-blue-700" },
    L2: { label: "L2 Engaged", color: "bg-amber-100 text-amber-700" },
    L3: { label: "L3 Deal", color: "bg-emerald-100 text-emerald-700" },
  };
  const c = config[level] ?? config.L0;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${c.color}`}>
      {c.label}
    </span>
  );
}

function EventBadge({ type }: { type: string }) {
  const config: Record<string, { icon: string; label: string; color: string }> = {
    delivered: { icon: "📨", label: "Delivered", color: "bg-blue-100 text-blue-700" },
    opened: { icon: "📬", label: "Opened", color: "bg-emerald-100 text-emerald-700" },
    clicked: { icon: "🖱️", label: "Clicked", color: "bg-primary/10 text-primary" },
    bounced: { icon: "🚫", label: "Bounced", color: "bg-red-100 text-red-700" },
    unsubscribed: { icon: "📭", label: "Unsubscribed", color: "bg-amber-100 text-amber-700" },
    complained: { icon: "⚠️", label: "Complained", color: "bg-red-100 text-red-700" },
  };
  const c = config[type] ?? { icon: "🔵", label: type, color: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

function formatTimeAgo(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
