import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Clock,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const [
    { count: activeListings },
    { count: pendingShowings },
    { data: confirmedThisWeek },
    { data: recentShowings },
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
      .from("appointments")
      .select("*, listings(address)")
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

  const stats = [
    {
      title: "Active Listings",
      value: activeListings ?? 0,
      icon: Building2,
      iconBg: "bg-blue-50 text-blue-600",
      href: "/listings",
    },
    {
      title: "Pending Requests",
      value: pendingShowings ?? 0,
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600",
      badge: (pendingShowings ?? 0) > 0,
      href: "/showings",
    },
    {
      title: "Confirmed This Week",
      value: confirmedThisWeek?.length ?? 0,
      icon: CalendarCheck,
      iconBg: "bg-emerald-50 text-emerald-600",
      href: "/calendar",
    },
    {
      title: "Missing Documents",
      value: listingsWithMissing.length,
      icon: AlertTriangle,
      iconBg: "bg-red-50 text-red-600",
      href: "/listings",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your real estate activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  {stat.badge && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                      New
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stat.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Showings + Quick Actions */}
      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Showings
            </CardTitle>
            <Link
              href="/showings"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentShowings ?? []).length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No showings yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Create a showing request to get started
                </p>
              </div>
            )}
            {(recentShowings ?? []).map((showing) => {
              const listing = (showing as Record<string, unknown>)
                .listings as { address: string } | null;
              return (
                <div
                  key={showing.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {listing?.address ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {showing.buyer_agent_name} &middot;{" "}
                      {formatDistanceToNow(new Date(showing.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <ShowingStatusBadge
                    status={
                      showing.status as
                        | "requested"
                        | "confirmed"
                        | "denied"
                        | "cancelled"
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                href: "/showings",
                title: "Manage Showings",
                desc: "Review and respond to requests",
                icon: Clock,
                iconBg: "bg-amber-50 text-amber-600",
              },
              {
                href: "/contacts",
                title: "Add Contact",
                desc: "Create a buyer or seller contact",
                icon: TrendingUp,
                iconBg: "bg-emerald-50 text-emerald-600",
              },
              {
                href: "/listings",
                title: "View Listings",
                desc: "Manage your property listings",
                icon: Building2,
                iconBg: "bg-blue-50 text-blue-600",
              },
              {
                href: "/calendar",
                title: "Open Calendar",
                desc: "View upcoming schedule",
                icon: CalendarCheck,
                iconBg: "bg-purple-50 text-purple-600",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors group"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.iconBg} shrink-0`}
                >
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
