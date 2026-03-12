import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { ShowingRequestForm } from "@/components/showings/ShowingRequestForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Clock, Phone, User, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ShowingsPage() {
  const supabase = createAdminClient();

  const [{ data: showings }, { data: listings }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, listings(address, lockbox_code)")
      .order("start_time", { ascending: false }),
    supabase
      .from("listings")
      .select("id, address")
      .eq("status", "active"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Showings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage showing requests
          </p>
        </div>
        <ShowingRequestForm listings={listings ?? []} />
      </div>

      {(showings ?? []).length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No showings yet"
          description="Create a showing request to get started. The seller will be notified via SMS or WhatsApp."
          action={<ShowingRequestForm listings={listings ?? []} />}
        />
      ) : (
        <div className="space-y-3">
          {(showings ?? []).map((showing) => {
            const listing = (showing as Record<string, unknown>)
              .listings as {
              address: string;
              lockbox_code: string;
            } | null;

            return (
              <Card key={showing.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        href={`/listings/${showing.listing_id}`}
                        className="flex items-center gap-1.5 font-semibold text-sm hover:text-primary"
                      >
                        <MapPin className="h-4 w-4" />
                        {listing?.address ?? "Unknown Listing"}
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {showing.buyer_agent_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {showing.buyer_agent_phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(showing.start_time).toLocaleString(
                            "en-CA",
                            {
                              timeZone: "America/Vancouver",
                              dateStyle: "medium",
                              timeStyle: "short",
                            }
                          )}
                        </span>
                        <span>&middot;</span>
                        <span>
                          {formatDistanceToNow(
                            new Date(showing.created_at),
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                      {showing.status === "confirmed" && listing && (
                        <p className="text-xs font-medium text-green-700 mt-1">
                          Lockbox: {listing.lockbox_code}
                        </p>
                      )}
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
