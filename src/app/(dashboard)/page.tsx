import { auth } from "@/lib/auth";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import Link from "next/link";
import PipelineSnapshot from "@/components/dashboard/PipelineSnapshot";
import { GreetingTicker } from "@/components/dashboard/GreetingTicker";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DailyDigestCard } from "@/components/dashboard/DailyDigestCard";
import type { DigestData } from "@/components/dashboard/DailyDigestCard";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "there";
  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe
  const now = Date.now();

  const tc = await getAuthenticatedTenantClient();

  const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeListings },
    { count: pendingShowings },
    { data: confirmedThisWeek },
    { data: tasks },
    { data: pipelineContacts },
    { data: pipelineListings },
    { data: allDocs },
    { data: activeBuyerJourneys },
    { count: emailsSent },
    { count: pendingDrafts },
    { data: recentEvents },
    { data: hotLeadContacts },
  ] = await Promise.all([
    tc.raw.from("listings").select("*", { count: "exact", head: true }).eq("realtor_id", tc.realtorId).eq("status", "active"),
    tc.raw.from("appointments").select("*", { count: "exact", head: true }).eq("realtor_id", tc.realtorId).eq("status", "requested"),
    tc.from("appointments").select("id").eq("status", "confirmed").gte("start_time", new Date(now - new Date().getDay() * 24 * 60 * 60 * 1000).toISOString()),
    tc.from("tasks").select("id, title, status, priority, category, due_date").neq("status", "completed").order("created_at", { ascending: false }).limit(20),
    tc.from("contacts").select("id, stage_bar, type"),
    tc.from("listings").select("id, seller_id, buyer_id, list_price, sold_price, commission_rate, commission_amount, status"),
    tc.from("listing_documents").select("listing_id, doc_type"),
    tc.from("buyer_journeys").select("id, status, contact_id").not("status", "in", "(closed,cancelled)"),
    // Digest: emails sent in last 24h
    tc.from("newsletters").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", yesterday),
    // Digest: pending drafts
    tc.from("newsletters").select("id", { count: "exact", head: true }).eq("status", "draft"),
    // Digest: recent engagement events
    tc.from("newsletter_events").select("event_type").gte("created_at", yesterday),
    // Digest: contacts with high engagement scores
    tc.from("contacts").select("name, type, newsletter_intelligence").not("newsletter_intelligence", "is", null).limit(100),
  ]);

  const activeListingIds = (pipelineListings ?? []).filter((l: any) => l.status === "active");
  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const listingsWithMissing = activeListingIds.filter((listing: any) => {
    const docs = (allDocs ?? []).filter((d: any) => d.listing_id === listing.id);
    const docTypes = docs.map((d: any) => d.doc_type);
    return requiredTypes.some((t: any) => !docTypes.includes(t));
  });

  const pendingTasks = (tasks ?? []).filter((t: any) => t.status === "pending").length;
  const inProgressTasks = (tasks ?? []).filter((t: any) => t.status === "in_progress").length;
  const openTasksCount = pendingTasks + inProgressTasks;

  const PIPELINE_STAGES = [
    { key: "new",            label: "New Leads",       color: "bg-[#C8F5F0]" },
    { key: "qualified",      label: "Qualified",        color: "bg-brand-light" },
    { key: "active",         label: "Active",           color: "bg-brand" },
    { key: "under_contract", label: "Under Contract",   color: "bg-[#FDAB3D]" },
    { key: "closed",         label: "Closed",           color: "bg-success" },
  ];

  const contacts = pipelineContacts ?? [];
  const listings = pipelineListings ?? [];

  function toPipelineKey(stageBar: string | null): string {
    if (!stageBar) return "new";
    if (stageBar === "active_search" || stageBar === "active_listing") return "active";
    if (["new", "qualified", "under_contract", "closed"].includes(stageBar)) return stageBar;
    return "new";
  }

  const contactsByStage: Record<string, typeof contacts> = {};
  for (const stage of PIPELINE_STAGES) contactsByStage[stage.key] = [];
  for (const c of contacts) {
    const key = toPipelineKey(c.stage_bar);
    if (contactsByStage[key]) contactsByStage[key].push(c);
  }

  function getDealValueForContact(contactId: string): number {
    let total = 0;
    for (const l of listings) {
      if (l.seller_id === contactId || l.buyer_id === contactId) {
        if (l.status === "sold" && l.sold_price) total += l.sold_price;
        else if (l.list_price) total += l.list_price;
      }
    }
    return total;
  }

  const pipelineStages = PIPELINE_STAGES.map((stage) => {
    const stageContacts = contactsByStage[stage.key];
    let value = 0;
    for (const c of stageContacts) value += getDealValueForContact(c.id);
    return { ...stage, count: stageContacts.length, value };
  });

  // ── Buyer pipeline stats ─────────────────────────────────────
  const activeJourneys = activeBuyerJourneys ?? [];
  const journeyStatusCounts: Record<string, number> = {};
  for (const j of activeJourneys) {
    journeyStatusCounts[j.status] = (journeyStatusCounts[j.status] ?? 0) + 1;
  }

  // GCI = sum of (commission_amount ?? (list_price * (commission_rate ?? 2.5) / 100))
  // for active + pending listings
  let totalGCI = 0;
  for (const l of listings) {
    if (l.status === "active" || l.status === "pending") {
      if (l.commission_amount) totalGCI += l.commission_amount;
      else if (l.list_price) totalGCI += l.list_price * ((l.commission_rate ?? 2.5) / 100);
    }
  }

  const initialDashboardStats = {
    activeListings: activeListings ?? 0,
    openTasks: openTasksCount,
    pendingShowings: pendingShowings ?? 0,
    missingDocs: listingsWithMissing.length,
    totalContacts: contacts.length,
    newLeadsToday: 0,
  };

  // ── Digest data assembly ────────────────────────────────────
  const opensToday = (recentEvents ?? []).filter((e: any) => e.event_type === "opened").length;
  const clicksToday = (recentEvents ?? []).filter((e: any) => e.event_type === "clicked").length;
  const sentCount = emailsSent ?? 0;
  const digestOpenRate = sentCount > 0 ? Math.round((opensToday / sentCount) * 100) : 0;

  const hotLeads = (hotLeadContacts ?? [])
    .filter((c: any) => {
      const intel = c.newsletter_intelligence as Record<string, unknown> | null;
      return intel && (intel.engagement_score as number) >= 60;
    })
    .slice(0, 5)
    .map((c: any) => ({
      name: c.name as string,
      type: c.type as string,
      score: (c.newsletter_intelligence as Record<string, unknown>)?.engagement_score as number,
    }));

  const digestData: DigestData = {
    emails_sent: sentCount,
    pending_drafts: pendingDrafts ?? 0,
    opens_today: opensToday,
    clicks_today: clicksToday,
    open_rate: digestOpenRate,
    hot_leads: hotLeads,
  };

  const clientTasks = (tasks ?? []).map((t: any) => ({
    id: t.id, title: t.title, status: t.status, priority: t.priority, category: t.category, due_date: t.due_date,
  }));

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="space-y-6 stagger-children">
        {/* ── Greeting ── */}
        <div className="animate-float-in">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {getGreeting()}, {userName}
              </h1>
            </div>
            <div className="hidden sm:block shrink-0">
              <GreetingTicker initialStats={initialDashboardStats} />
            </div>
          </div>
        </div>

        {/* ── Pipeline Snapshot (always visible) ── */}
        <div className="animate-float-in" style={{ animationDelay: "40ms" }}>
          <PipelineSnapshot stages={pipelineStages} totalGCI={totalGCI} />
        </div>

        {/* ── AI Email Digest ── */}
        <div className="animate-float-in" style={{ animationDelay: "60ms" }}>
          <DailyDigestCard digest={digestData} />
        </div>

        {/* ── Buyer Journeys ── */}
        {activeJourneys.length > 0 && (
          <div className="animate-float-in" style={{ animationDelay: "80ms" }}>
            <div className="lf-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">🏠 Buyer Journeys</h3>
                <Link href="/contacts?role=buyer" className="text-xs text-brand hover:text-brand-dark font-medium">
                  View all →
                </Link>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-brand">{activeJourneys.length}</span>
                <span className="text-xs text-muted-foreground mb-1">active journeys</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(journeyStatusCounts).map(([status, count]) => (
                  <span key={status} className="px-2 py-0.5 rounded-full bg-brand-muted text-brand-dark text-xs font-medium capitalize">
                    {status.replace("_", " ")} ({count})
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Command Center: Calendar + Feed ── */}
        <DashboardShell
          initialTasks={clientTasks}
          pendingShowings={pendingShowings ?? 0}
          activeListings={activeListings ?? 0}
        />
      </div>
    </div>
  );
}
