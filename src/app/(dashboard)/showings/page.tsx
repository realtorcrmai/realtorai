import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Clock, MapPin, User, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type AppointmentWithListing = {
  id: string;
  status: "requested" | "confirmed" | "denied" | "cancelled";
  start_time: string;
  end_time: string;
  buyer_agent_name: string;
  buyer_agent_phone: string;
  buyer_agent_email: string | null;
  notes: string | null;
  listings: {
    id: string;
    address: string;
    seller_id: string;
    contacts: {
      id: string;
      name: string;
    } | null;
  } | null;
};

const STATUS_BADGE_COLORS: Record<
  "requested" | "confirmed" | "denied" | "cancelled",
  string
> = {
  requested: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<
  "requested" | "confirmed" | "denied" | "cancelled",
  string
> = {
  requested: "Requested",
  confirmed: "Confirmed",
  denied: "Denied",
  cancelled: "Cancelled",
};

export default async function ShowingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = (params.status as string) || "all";

  const supabase = createAdminClient();

  const { data: allShowings } = await supabase
    .from("appointments")
    .select("*, listings(id, address, seller_id, contacts(id, name))")
    .order("start_time", { ascending: false });

  if (!allShowings) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Card className="max-w-sm w-full animate-float-in">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              No Showings Yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Schedule your first showing to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typedShowings = allShowings as AppointmentWithListing[];

  // Filter by status
  const filteredShowings =
    statusFilter === "all"
      ? typedShowings
      : typedShowings.filter((s) => s.status === statusFilter);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-CA", {
      timeZone: "America/Vancouver",
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Showings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filteredShowings.length} showing{filteredShowings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {["all", "requested", "confirmed", "denied", "cancelled"].map(
          (status) => (
            <Link key={status} href={`/showings?status=${status}`}>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {status === "all"
                  ? "All"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            </Link>
          )
        )}
      </div>

      {/* Showings List or Empty State */}
      {filteredShowings.length === 0 ? (
        <Card className="max-w-md animate-float-in">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {typedShowings.length === 0
                ? "No Showings Yet"
                : "No Results"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {typedShowings.length === 0
                ? "Schedule your first showing to get started."
                : "Try adjusting your status filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Listing Address
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Seller
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Buyer Agent
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Date & Time
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShowings.map((showing) => (
                  <tr
                    key={showing.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/showings/${showing.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        <MapPin className="h-4 w-4 shrink-0" />
                        {showing.listings?.address || "Unknown"}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-foreground">
                        {showing.listings?.contacts?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {showing.buyer_agent_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {showing.buyer_agent_phone}
                          </span>
                        </div>
                        {showing.buyer_agent_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {showing.buyer_agent_email}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/showings/${showing.id}`}
                        className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDateTime(showing.start_time)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={`capitalize ${
                          STATUS_BADGE_COLORS[showing.status]
                        }`}
                      >
                        {STATUS_LABELS[showing.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredShowings.map((showing) => (
              <Link key={showing.id} href={`/showings/${showing.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header with address and status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <h3 className="font-semibold text-foreground truncate">
                            {showing.listings?.address || "Unknown"}
                          </h3>
                        </div>
                        <Badge
                          className={`shrink-0 capitalize ${
                            STATUS_BADGE_COLORS[showing.status]
                          }`}
                        >
                          {STATUS_LABELS[showing.status]}
                        </Badge>
                      </div>

                      {/* Seller */}
                      <div className="text-xs text-muted-foreground">
                        Seller: {showing.listings?.contacts?.name || "Unknown"}
                      </div>

                      {/* Buyer Agent */}
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground font-medium">
                            {showing.buyer_agent_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {showing.buyer_agent_phone}
                          </span>
                        </div>
                        {showing.buyer_agent_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">
                              {showing.buyer_agent_email}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Date/Time */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                        <Clock className="h-4 w-4" />
                        {formatDateTime(showing.start_time)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
