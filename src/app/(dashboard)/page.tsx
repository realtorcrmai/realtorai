import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  Building2,
  Clock,
  CalendarCheck,
  ListTodo,
  Search,
  GitBranch,
  Upload,
  FileText,
  Users,
  Wand2,
  Globe,
  Mail,
  ArrowRight,
  Target,
  Zap,
} from "lucide-react";
import { RemindersWidget } from "@/components/dashboard/RemindersWidget";
import PipelineSnapshot from "@/components/dashboard/PipelineSnapshot";
import AIRecommendations from "@/components/dashboard/AIRecommendations";
import { FloatingTaskBanner } from "@/components/dashboard/FloatingTaskBanner";
import { getRecommendations } from "@/actions/recommendations";
import { getOvernightSummary } from "@/actions/agent-settings";
import OvernightSummary from "@/components/dashboard/OvernightSummary";

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

  const supabase = createAdminClient();

  const [
    { count: activeListings },
    { count: pendingShowings },
    { data: confirmedThisWeek },
    { data: tasks },
    { count: activeDealsCount },
    { data: pipelineContacts },
    { data: pipelineListings },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase
      .from("appointments")
      .select("id")
      .eq("status", "confirmed")
      .gte(
        "start_time",
        new Date(
          Date.now() - new Date().getDay() * 24 * 60 * 60 * 1000
        ).toISOString()
      ),
    supabase
      .from("tasks")
      .select("*")
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("contacts").select("id, stage_bar, type"),
    supabase.from("listings").select("id, seller_id, buyer_id, list_price, sold_price, commission_rate, commission_amount, status"),
  ]);

  const [
    { count: pendingNewsletters },
    { count: sentNewsletters },
  ] = await Promise.all([
    supabase.from("newsletters").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("newsletters").select("*", { count: "exact", head: true }).eq("status", "sent"),
  ]);

  const { data: allListings } = await supabase
    .from("listings")
    .select("id")
    .eq("status", "active");

  const { data: allDocs } = await supabase
    .from("listing_documents")
    .select("listing_id, doc_type");

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const listingsWithMissing = (allListings ?? []).filter((listing) => {
    const docs = (allDocs ?? []).filter((d) => d.listing_id === listing.id);
    const docTypes = docs.map((d) => d.doc_type);
    return requiredTypes.some((t) => !docTypes.includes(t));
  });

  const pendingTasks = (tasks ?? []).filter(
    (t) => t.status === "pending"
  ).length;
  const inProgressTasks = (tasks ?? []).filter(
    (t) => t.status === "in_progress"
  ).length;
  const openTasksCount = pendingTasks + inProgressTasks;

  const enabledFeatures = session?.user?.enabledFeatures ?? [];

  // ── Pipeline Snapshot computation ──────────────────────────
  const PIPELINE_STAGES = [
    { key: "new", label: "New Leads", color: "bg-sky-500" },
    { key: "qualified", label: "Qualified", color: "bg-amber-500" },
    { key: "active", label: "Active", color: "bg-green-500" },
    { key: "under_contract", label: "Under Contract", color: "bg-orange-500" },
    { key: "closed", label: "Closed", color: "bg-emerald-600" },
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
  for (const stage of PIPELINE_STAGES) {
    contactsByStage[stage.key] = [];
  }
  for (const c of contacts) {
    const key = toPipelineKey(c.stage_bar);
    if (contactsByStage[key]) contactsByStage[key].push(c);
  }

  function getDealValueForContact(contactId: string): number {
    let total = 0;
    for (const l of listings) {
      if (l.seller_id === contactId || l.buyer_id === contactId) {
        if (l.status === "sold" && l.sold_price) {
          total += l.sold_price;
        } else if (l.list_price) {
          total += l.list_price;
        }
      }
    }
    return total;
  }

  const pipelineStages = PIPELINE_STAGES.map((stage) => {
    const stageContacts = contactsByStage[stage.key];
    let value = 0;
    for (const c of stageContacts) {
      value += getDealValueForContact(c.id);
    }
    return { ...stage, count: stageContacts.length, value };
  });

  let totalGCI = 0;
  for (const l of listings) {
    if (l.status === "active" || l.status === "pending") {
      if (l.commission_amount) {
        totalGCI += l.commission_amount;
      } else if (l.list_price) {
        totalGCI += l.list_price * ((l.commission_rate ?? 2.5) / 100);
      }
    }
  }

  const allFeatureTiles = [
    {
      key: "listings",
      href: "/listings",
      title: "Listings",
      description: "Manage property listings, photos & pricing",
      icon: Building2,
      gradient: "gradient-teal",
      count: (activeListings ?? 0) > 0 ? activeListings : null,
      countLabel: "active",
    },
    {
      key: "contacts",
      href: "/contacts",
      title: "Contacts",
      description: "Buyers, sellers & agent relationships",
      icon: Users,
      gradient: "gradient-amber",
      count: null,
      countLabel: null,
    },
    {
      key: "pipeline",
      href: "/pipeline",
      title: "Pipeline",
      description: "Track buyer & seller deals",
      icon: Target,
      gradient: "gradient-emerald",
      count: (activeDealsCount ?? 0) > 0 ? activeDealsCount : null,
      countLabel: "active",
    },
    {
      key: "tasks",
      href: "/tasks",
      title: "Tasks",
      description: "Daily to-do items & follow-ups",
      icon: ListTodo,
      gradient: "gradient-indigo",
      count: openTasksCount > 0 ? openTasksCount : null,
      countLabel: "open",
    },
    {
      key: "showings",
      href: "/showings",
      title: "Showings",
      description: "Track & manage showing requests",
      icon: Clock,
      gradient: "gradient-orange",
      count: (pendingShowings ?? 0) > 0 ? pendingShowings : null,
      countLabel: "pending",
    },
    {
      key: "calendar",
      href: "/calendar",
      title: "Calendar",
      description: "View your schedule at a glance",
      icon: CalendarCheck,
      gradient: "gradient-teal",
      count:
        (confirmedThisWeek?.length ?? 0) > 0
          ? confirmedThisWeek?.length
          : null,
      countLabel: "this week",
    },
    {
      key: "content",
      href: "/content",
      title: "Content Engine",
      description: "AI-powered MLS remarks, video & images",
      icon: Wand2,
      gradient: "gradient-rose",
      count: null,
      countLabel: null,
    },
    {
      key: "search",
      href: "/search",
      title: "Property Search",
      description: "Find properties for your buyers",
      icon: Search,
      gradient: "gradient-blue",
      count: null,
      countLabel: null,
    },
    {
      key: "workflow",
      href: "/workflow",
      title: "MLS Workflow",
      description: "7-phase listing pipeline tracker",
      icon: GitBranch,
      gradient: "gradient-pink",
      count: null,
      countLabel: null,
    },
    {
      key: "import",
      href: "/import",
      title: "Excel Import",
      description: "Import listings from spreadsheets",
      icon: Upload,
      gradient: "gradient-cyan",
      count: null,
      countLabel: null,
    },
    {
      key: "forms",
      href: "/forms",
      title: "BC Forms",
      description: "Standard BC real estate documents",
      icon: FileText,
      gradient: "gradient-violet",
      count: null,
      countLabel: null,
    },
    {
      key: "website",
      href: "http://localhost:8768",
      title: "Website Marketing",
      description: "AI-powered realtor website generation",
      icon: Globe,
      gradient: "gradient-amber",
      count: null,
      countLabel: null,
      external: true,
    },
    {
      key: "newsletters",
      href: "/newsletters",
      title: "Email Marketing",
      description: "AI newsletters, journeys & click intelligence",
      icon: Mail,
      gradient: "gradient-rose",
      count: (pendingNewsletters ?? 0) > 0 ? pendingNewsletters : (sentNewsletters ?? 0) > 0 ? sentNewsletters : null,
      countLabel: (pendingNewsletters ?? 0) > 0 ? "drafts" : "sent",
    },
    {
      key: "automations",
      href: "/automations",
      title: "Automations",
      description: "AI-powered workflow automations & triggers",
      icon: Zap,
      gradient: "gradient-amber",
      count: null,
      countLabel: null,
    },
  ];

  // Filter tiles based on user's enabled features
  const featureTiles = enabledFeatures.length > 0
    ? allFeatureTiles.filter((tile) => enabledFeatures.includes(tile.key))
    : allFeatureTiles;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
    <div className="space-y-8">
      {/* Greeting */}
      <div className="animate-float-in">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {new Date().toLocaleDateString("en-CA", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {getGreeting()}, {userName}
            </h1>
          </div>
          <p className="hidden sm:block text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 shrink-0">
            Try <span className="text-primary font-semibold">&ldquo;show me my tasks&rdquo;</span> in the voice panel
          </p>
        </div>
      </div>

      {/* Task Ticker Banner */}
      <FloatingTaskBanner tasks={tasks ?? []} openTasksCount={openTasksCount} />

      {/* AI Overnight Summary */}
      <OvernightSummarySection />

      {/* Pipeline Snapshot */}
      <div className="animate-float-in" style={{ animationDelay: "80ms" }}>
        <PipelineSnapshot stages={pipelineStages} totalGCI={totalGCI} />
      </div>

      {/* AI Recommendations */}
      <AIRecommendationsSection />

      {/* Feature Hub */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Your Workspace
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 stagger-children">
          {featureTiles.map((tile) => {
            const tileContent = (
              <>
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 ${tile.gradient} transition-opacity`}
                />

                {/* Light overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-black/8" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/20">
                      <tile.icon className="h-6 w-6" />
                    </div>
                    {tile.count != null && tile.count > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/15 px-2.5 py-1 text-xs font-semibold">
                        {tile.count} {tile.countLabel}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-1 tracking-tight">
                    {tile.title}
                  </h3>
                  <p className="text-sm text-white/75 leading-relaxed">
                    {tile.description}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="absolute bottom-5 right-5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight className="h-5 w-5 text-white/70" />
                </div>
              </>
            );

            const className = "group relative overflow-hidden rounded-2xl p-6 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_oklch(0_0_0/20%)] elevation-4";

            return "external" in tile ? (
              <a key={tile.href} href={tile.href} target="_blank" rel="noopener noreferrer" className={className}>
                {tileContent}
              </a>
            ) : (
              <Link key={tile.href} href={tile.href} className={className}>
                {tileContent}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Reminders Widget */}
      <div className="animate-float-in" style={{ animationDelay: "300ms" }}>
        <RemindersWidget />
      </div>
    </div>

    </div>
  );
}

async function OvernightSummarySection() {
  try {
    const data = await getOvernightSummary();
    return <OvernightSummary data={data} />;
  } catch {
    return null;
  }
}

async function AIRecommendationsSection() {
  try {
    const recommendations = await getRecommendations();
    if (!recommendations.length) return null;
    return (
      <div className="animate-float-in" style={{ animationDelay: "100ms" }}>
        <AIRecommendations recommendations={recommendations as any} />
      </div>
    );
  } catch {
    return null; // Silently fail if agent_recommendations table doesn't exist yet
  }
}
