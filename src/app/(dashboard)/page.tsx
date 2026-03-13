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
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

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
      gradient: "gradient-emerald",
      count:
        (confirmedThisWeek?.length ?? 0) > 0
          ? confirmedThisWeek?.length
          : null,
      countLabel: "this week",
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
  ];

  const quickStats = [
    {
      label: "Active Listings",
      value: activeListings ?? 0,
      color: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Open Tasks",
      value: openTasksCount,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pending Showings",
      value: pendingShowings ?? 0,
      color: "text-teal-600 dark:text-teal-400",
    },
    {
      label: "Missing Docs",
      value: listingsWithMissing.length,
      color: "text-rose-600 dark:text-rose-400",
      icon: listingsWithMissing.length > 0 ? AlertTriangle : null,
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

      {/* Quick Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-float-in" style={{ animationDelay: "80ms" }}>
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-xl px-4 py-3 elevation-2 transition-all duration-200 hover:elevation-4"
          >
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              {stat.icon && (
                <stat.icon className="h-4 w-4 text-rose-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Feature Hub */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Your Workspace
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 stagger-children">
          {featureTiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group relative overflow-hidden rounded-2xl p-6 text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_oklch(0_0_0/20%)] elevation-4"
            >
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
            </Link>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
