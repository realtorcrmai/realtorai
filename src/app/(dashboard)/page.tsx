import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, CalendarCheck, AlertTriangle } from "lucide-react";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createAdminClient();

  // Fetch stats in parallel
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

  // Check for listings with missing required documents
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
      color: "text-green-600",
    },
    {
      title: "Pending Requests",
      value: pendingShowings ?? 0,
      icon: Clock,
      color: "text-amber-600",
      badge: (pendingShowings ?? 0) > 0,
    },
    {
      title: "Confirmed This Week",
      value: confirmedThisWeek?.length ?? 0,
      icon: CalendarCheck,
      color: "text-blue-600",
    },
    {
      title: "Missing Documents",
      value: listingsWithMissing.length,
      icon: AlertTriangle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.badge && (
                      <Badge variant="destructive" className="text-xs">
                        Action needed
                      </Badge>
                    )}
                  </div>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Showings */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Showings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(recentShowings ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No showings yet.
              </p>
            )}
            {(recentShowings ?? []).map((showing) => {
              const listing = (showing as Record<string, unknown>)
                .listings as { address: string } | null;
              return (
                <div
                  key={showing.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {listing?.address ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
            <Link
              href="/showings"
              className="block text-sm text-primary text-center pt-2"
            >
              View all showings
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/showings"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium">Manage Showings</p>
              <p className="text-xs text-muted-foreground">
                Review and respond to showing requests
              </p>
            </Link>
            <Link
              href="/contacts"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium">Add Contact</p>
              <p className="text-xs text-muted-foreground">
                Create a new buyer or seller contact
              </p>
            </Link>
            <Link
              href="/listings"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium">View Listings</p>
              <p className="text-xs text-muted-foreground">
                Manage your active property listings
              </p>
            </Link>
            <Link
              href="/calendar"
              className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <p className="text-sm font-medium">Open Calendar</p>
              <p className="text-xs text-muted-foreground">
                View your schedule and upcoming showings
              </p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
