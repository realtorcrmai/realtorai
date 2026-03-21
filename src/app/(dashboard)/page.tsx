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
  ArrowRight,
  AlertTriangle,
  Target,
  Trophy,
  DollarSign,
  Landmark,
  Calendar,
} from "lucide-react";
import { RemindersWidget } from "@/components/dashboard/RemindersWidget";

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

  // Current month boundaries for "closed this month"
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    { count: activeListings },
    { count: pendingShowings },
    { data: confirmedThisWeek },
    { data: tasks },
    { count: activeDealsCount },
    { data: wonDeals },
    { data: upcomingMortgages },
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
    supabase
      .from("deals")
      .select("id, status, value, commission_amount, close_date")
      .eq("status", "won"),
    supabase
      .from("mortgages")
      .select("id, lender_name, renewal_date, mortgage_amount, interest_rate, mortgage_type, contact_id, deal_id, contacts(id, name), deals(id, title)")
      .gte("renewal_date", today)
      .lte("renewal_date", in90Days)
      .order("renewal_date", { ascending: true }),
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

  // Deal stats
  const allWonDeals = wonDeals ?? [];
  const closedThisMonth = allWonDeals.filter(
    (d) => d.close_date && d.close_date >= monthStart
  ).length;
  const earnedGCI = allWonDeals.reduce(
    (sum, d) => sum + (Number(d.commission_amount) || 0),
    0
  );

  const featureTiles = [
    {
      href: "/listings",
      title: "Listings",
      description: "Manage property listings, photos & pricing",
      icon: Building2,
      gradient: "gradient-indigo",
      count: (activeListings ?? 0) > 0 ? activeListings : null,
      countLabel: "active",
    },
    {
      href: "/contacts",
      title: "Contacts",
      description: "Buyers, sellers & agent relationships",
      icon: Users,
      gradient: "gradient-violet",
      count: null,
      countLabel: null,
    },
    {
      href: "/pipeline",
      title: "Pipeline",
      description: "Track buyer & seller deals",
      icon: Target,
      gradient: "gradient-emerald",
      count: (activeDealsCount ?? 0) > 0 ? activeDealsCount : null,
      countLabel: "active",
    },
    {
      href: "/tasks",
      title: "Tasks",
      description: "Daily to-do items & follow-ups",
      icon: ListTodo,
      gradient: "gradient-blue",
      count: openTasksCount > 0 ? openTasksCount : null,
      countLabel: "open",
    },
    {
      href: "/showings",
      title: "Showings",
      description: "Track & manage showing requests",
      icon: Clock,
      gradient: "gradient-teal",
      count: (pendingShowings ?? 0) > 0 ? pendingShowings : null,
      countLabel: "pending",
    },
    {
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
      href: "/content",
      title: "Content Engine",
      description: "AI-powered MLS remarks, video & images",
      icon: Wand2,
      gradient: "gradient-violet",
      count: null,
      countLabel: null,
    },
    {
      href: "/search",
      title: "Property Search",
      description: "Find properties for your buyers",
      icon: Search,
      gradient: "gradient-cyan",
      count: null,
      countLabel: null,
    },
    {
      href: "/workflow",
      title: "MLS Workflow",
      description: "7-phase listing pipeline tracker",
      icon: GitBranch,
      gradient: "gradient-amber",
      count: null,
      countLabel: null,
    },
    {
      href: "/import",
      title: "Excel Import",
      description: "Import listings from spreadsheets",
      icon: Upload,
      gradient: "gradient-orange",
      count: null,
      countLabel: null,
    },
    {
      href: "/forms",
      title: "BC Forms",
      description: "Standard BC real estate documents",
      icon: FileText,
      gradient: "gradient-rose",
      count: null,
      countLabel: null,
    },
    {
      href: "http://localhost:3001",
      title: "Website Marketing",
      description: "Build & manage your realtor website",
      icon: Globe,
      gradient: "gradient-pink",
      count: null,
      countLabel: null,
      external: true,
    },
  ];

  const quickStats = [
    {
      label: "Active Deals",
      value: activeDealsCount ?? 0,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50/60 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900",
      icon: Target,
      iconColor: "text-indigo-500",
      href: "/pipeline",
    },
    {
      label: "Closed This Month",
      value: closedThisMonth,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900",
      icon: Trophy,
      iconColor: "text-emerald-500",
      href: "/pipeline",
    },
    {
      label: "Earned GCI",
      value: earnedGCI > 0 ? `$${earnedGCI.toLocaleString("en-CA")}` : "$0",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50/60 border-green-100 dark:bg-green-950/30 dark:border-green-900",
      icon: DollarSign,
      iconColor: "text-green-500",
      href: "/pipeline",
    },
    {
      label: "Open Tasks",
      value: openTasksCount,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50/60 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900",
      icon: ListTodo,
      iconColor: "text-amber-500",
      href: "/tasks",
    },
  ];

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

      {/* Quick Stats Strip — clickable links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-float-in" style={{ animationDelay: "80ms" }}>
        {quickStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-xl px-4 py-3.5 border transition-all duration-200 hover:shadow-md hover:ring-2 hover:ring-primary/20 cursor-pointer ${stat.bg}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {stat.label}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-white/60 dark:bg-white/10 ${stat.iconColor}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Mortgage Renewal Alerts */}
      {(upcomingMortgages ?? []).length > 0 && (
        <div className="animate-float-in rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-5" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="h-4.5 w-4.5 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Upcoming Mortgage Renewals
            </h3>
            <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              {(upcomingMortgages ?? []).length} within 90 days
            </span>
          </div>
          <div className="space-y-2.5">
            {(upcomingMortgages ?? []).map((m: Record<string, unknown>) => {
              const contact = m.contacts as { id: string; name: string } | null;
              const deal = m.deals as { id: string; title: string } | null;
              const renewalDate = new Date(m.renewal_date as string);
              const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysUntil <= 30;
              return (
                <div key={m.id as string} className="flex items-center gap-3 rounded-lg bg-white/70 dark:bg-white/5 border border-amber-100 dark:border-amber-800/50 px-4 py-3">
                  <div className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {daysUntil}d
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {contact && (
                        <Link href={`/contacts/${contact.id}`} className="text-sm font-semibold hover:text-primary transition-colors">
                          {contact.name}
                        </Link>
                      )}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{m.lender_name as string}</span>
                      <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {isUrgent ? "Urgent" : "Upcoming"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Renewal: {renewalDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      {m.mortgage_amount && ` · $${Number(m.mortgage_amount).toLocaleString("en-CA")}`}
                      {m.interest_rate && ` · ${m.interest_rate}% ${m.mortgage_type}`}
                    </p>
                  </div>
                  {deal && (
                    <Link href={`/pipeline/${deal.id}`} className="shrink-0 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                      Deal <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
