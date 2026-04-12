import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, User, Phone } from "lucide-react";
import { ShowingWorkflow } from "@/components/showings/ShowingWorkflow";
import { ShowingContextPanel } from "@/components/showings/ShowingContextPanel";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ShowingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getAuthenticatedTenantClient();

  const { data: showing } = await supabase
    .from("appointments")
    .select("*, listings(*, contacts!listings_seller_id_fkey(id, name, phone, email))")
    .eq("id", id)
    .single();

  if (!showing) notFound();

  const listing = (showing as Record<string, unknown>).listings as {
    id: string;
    address: string;
    lockbox_code: string;
    contacts: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
    } | null;
  } | null;

  return (
    <div className="flex h-full">
      {/* CENTER -- scrollable */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="animate-float-in">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight truncate">
                      {listing?.address ?? "Unknown Listing"}
                    </h1>
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
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {showing.buyer_agent_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {showing.buyer_agent_phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {new Date(showing.start_time).toLocaleString("en-CA", {
                        timeZone: "America/Vancouver",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span>&middot;</span>
                    <span>
                      {formatDistanceToNow(new Date(showing.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Showing Workflow */}
          <Card>
            <CardContent className="p-6">
              <ShowingWorkflow showing={showing} />
            </CardContent>
          </Card>

          {/* Notes section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes & Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {showing.notes ? (
                <p className="text-sm">{showing.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes for this showing yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile: collapsible context (hidden on desktop) */}
        <div className="lg:hidden border-t border-border mt-4">
          <details className="group" open>
            <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors">
              <span>📍 Showing Details</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 border-t border-border">
              <ShowingContextPanel showing={showing as any} />
            </div>
          </details>
        </div>
      </div>

      {/* Desktop: fixed right panel */}
      <aside className="hidden lg:block w-[340px] shrink-0 border-l overflow-y-auto p-6 bg-card/30">
        <ShowingContextPanel showing={showing as any} />
      </aside>
    </div>
  );
}
