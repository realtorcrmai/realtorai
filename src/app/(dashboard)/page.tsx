import { auth } from "@/lib/auth";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import PipelineSnapshot from "@/components/dashboard/PipelineSnapshot";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OnboardingBanner } from "@/components/dashboard/OnboardingBanner";
import { WelcomeConfetti } from "@/components/dashboard/WelcomeConfetti";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import type { FeedItem } from "@/components/dashboard/ActivityFeed";
import TodaysPriorities from "@/components/dashboard/TodaysPriorities";
import DashboardPipelineWidget from "@/components/dashboard/DashboardPipelineWidget";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Clock, ListTodo, Users } from "lucide-react";
import Link from "next/link";

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

  const [
    { count: activeListings },
    { count: pendingShowings },
    { data: confirmedThisWeek },
    { data: tasks },
    { data: pipelineContacts },
    { data: pipelineListings },
    { data: allDocs },
    { data: recentComms },
    { data: recentEvents },
    { data: pipelineDealsRaw },
  ] = await Promise.all([
    tc.raw.from("listings").select("*", { count: "exact", head: true }).eq("realtor_id", tc.realtorId).eq("status", "active"),
    tc.raw.from("appointments").select("*", { count: "exact", head: true }).eq("realtor_id", tc.realtorId).eq("status", "requested"),
    tc.from("appointments").select("id").eq("status", "confirmed").gte("start_time", new Date(now - new Date().getDay() * 24 * 60 * 60 * 1000).toISOString()),
    tc.from("tasks").select("id, title, status, priority, category, due_date").neq("status", "completed").order("created_at", { ascending: false }).limit(20),
    tc.from("contacts").select("id, stage_bar, type, newsletter_intelligence"),
    tc.from("listings").select("id, seller_id, buyer_id, list_price, sold_price, commission_rate, commission_amount, status"),
    tc.from("listing_documents").select("listing_id, doc_type"),
    tc.from("communications").select("id, direction, channel, body, created_at, contact_id, contacts(name)").order("created_at", { ascending: false }).limit(6),
    tc.from("newsletter_events").select("id, event_type, created_at, newsletters(subject, contact_id, contacts(name))").order("created_at", { ascending: false }).limit(6),
    tc.from("property_deals").select("id, name, stage, value, contact_id, contacts(name)").in("status", ["active"]).order("updated_at", { ascending: false }).limit(12),
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

  const clientTasks = (tasks ?? []).map((t: any) => ({
    id: t.id, title: t.title, status: t.status, priority: t.priority, category: t.category, due_date: t.due_date,
  }));

  // Overdue tasks: due_date < today and not completed
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = (tasks ?? []).filter(
    (t: any) => t.due_date && t.due_date < todayStr && t.status !== "completed"
  ).length;

  // Hot leads: contacts with engagement_score >= 60 in newsletter_intelligence
  const hotLeadsCount = (pipelineContacts ?? []).filter((c: any) => {
    const intel = c.newsletter_intelligence;
    if (!intel || typeof intel !== "object") return false;
    return (intel as any).engagement_score >= 60;
  }).length;

  // Build activity feed from communications + newsletter_events
  const commFeedItems: FeedItem[] = (recentComms ?? []).map((c: any) => {
    const contactName = c.contacts?.name ?? "Unknown";
    const channelIcon = c.channel === "email" ? "\uD83D\uDCE7" : c.channel === "sms" ? "\uD83D\uDCF1" : c.channel === "whatsapp" ? "\uD83D\uDCAC" : "\uD83D\uDCE8";
    return {
      id: `comm-${c.id}`,
      icon: channelIcon,
      title: `${c.direction === "outbound" ? "Sent" : "Received"} ${c.channel ?? "message"}`,
      subtitle: `${contactName}: ${(c.body ?? "").slice(0, 80)}`,
      timestamp: c.created_at,
      href: c.contact_id ? `/contacts/${c.contact_id}` : "/contacts",
    };
  });

  const eventFeedItems: FeedItem[] = (recentEvents ?? []).map((e: any) => {
    const nl = e.newsletters as any;
    const contactName = nl?.contacts?.name ?? "Subscriber";
    const eventIcon = e.event_type === "open" ? "\uD83D\uDC40" : e.event_type === "click" ? "\uD83D\uDD17" : e.event_type === "bounce" ? "\u26A0\uFE0F" : "\uD83D\uDCE9";
    return {
      id: `evt-${e.id}`,
      icon: eventIcon,
      title: `Email ${e.event_type}`,
      subtitle: `${contactName} — ${nl?.subject ?? "Newsletter"}`,
      timestamp: e.created_at,
      href: "/newsletters/analytics",
    };
  });

  const feedItems: FeedItem[] = [...commFeedItems, ...eventFeedItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  // Pipeline deals — gracefully handle missing table
  const pipelineDeals = (pipelineDealsRaw ?? []).map((d: any) => ({
    id: d.id,
    name: d.name ?? "Untitled Deal",
    stage: d.stage ?? "new",
    value: d.value ?? 0,
    contacts: d.contacts ?? null,
  }));

  return (
    <>
      <PageHeader
        title={`${getGreeting()}, ${userName}`}
        subtitle={new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
      />
      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Link href="/listings?status=active" className="group">
            <Card className="border-l-4 border-l-brand transition-shadow group-hover:shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Listings</p>
                  <p className="text-2xl font-semibold text-foreground">{initialDashboardStats.activeListings}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/showings" className="group">
            <Card className="border-l-4 border-l-[#f5c26b] transition-shadow group-hover:shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#f5c26b]/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-[#8a5a1e]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Showings</p>
                  <p className="text-2xl font-semibold text-foreground">{initialDashboardStats.pendingShowings}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/tasks" className="group">
            <Card className="border-l-4 border-l-primary transition-shadow group-hover:shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Open Tasks</p>
                  <p className="text-2xl font-semibold text-foreground">{initialDashboardStats.openTasks}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/contacts" className="group">
            <Card className="border-l-4 border-l-success transition-shadow group-hover:shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Contacts</p>
                  <p className="text-2xl font-semibold text-foreground">{initialDashboardStats.totalContacts}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <WelcomeConfetti />
        <OnboardingBanner />

        {/* Pipeline */}
        <PipelineSnapshot stages={pipelineStages} totalGCI={totalGCI} />

        {/* Priorities */}
        <TodaysPriorities
          overdueTasks={overdueTasks}
          hotLeads={hotLeadsCount}
          pendingShowings={pendingShowings ?? 0}
          missingDocs={listingsWithMissing.length}
          confirmedThisWeek={confirmedThisWeek?.length ?? 0}
        />

        {/* Activity Feed + Deal Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed items={feedItems} />
          <DashboardPipelineWidget deals={pipelineDeals} />
        </div>

        {/* Command Center */}
        <DashboardShell
          initialTasks={clientTasks}
          pendingShowings={pendingShowings ?? 0}
          activeListings={activeListings ?? 0}
        />
      </div>
    </>
  );
}
