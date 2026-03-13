import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Key, Clock, User } from "lucide-react";
import { ListingWorkflow } from "@/components/listings/ListingWorkflow";
import { FormReadinessPanel } from "@/components/listings/FormReadinessPanel";
import { ConveyancingPackButton } from "@/components/listings/ConveyancingPackButton";
import { ShowingRequestForm } from "@/components/showings/ShowingRequestForm";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { NeighborhoodButton } from "@/components/listings/NeighborhoodButton";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ListingDocument } from "@/types";
import { LISTING_STATUS_COLORS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, contacts(id, name, phone, email)")
    .eq("id", id)
    .single();

  if (!listing) notFound();

  const seller = (listing as Record<string, unknown>).contacts as {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;

  if (!seller) notFound();

  const [
    { data: documents },
    { data: showings },
    { data: allListings },
    { data: formSubmissions },
  ] = await Promise.all([
    supabase
      .from("listing_documents")
      .select("*")
      .eq("listing_id", id),
    supabase
      .from("appointments")
      .select("*")
      .eq("listing_id", id)
      .order("start_time", { ascending: false }),
    supabase
      .from("listings")
      .select("id, address")
      .eq("status", "active"),
    supabase
      .from("form_submissions")
      .select("form_key, status")
      .eq("listing_id", id),
  ]);

  // Build form status map for the right panel
  const formStatuses = Object.fromEntries(
    (formSubmissions ?? []).map((s) => [s.form_key, s.status as "draft" | "completed"])
  );

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const docTypes = (documents ?? []).map((d) => d.doc_type);
  const hasMissingDocs = requiredTypes.some((t) => !docTypes.includes(t));

  return (
    <div className="flex h-full">
      {/* CENTER — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6">
          {hasMissingDocs && (
            <AlertBanner message="Missing Required Documents — Upload FINTRAC, DORTS, and PDS before creating showings or generating conveyancing packs." />
          )}

          {/* Listing Header — compact */}
          <Card className="animate-float-in">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight truncate">
                      {listing.address}
                    </h1>
                    <Badge
                      variant="secondary"
                      className={`${LISTING_STATUS_COLORS[listing.status as keyof typeof LISTING_STATUS_COLORS]} text-xs shrink-0`}
                    >
                      {listing.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {listing.list_price != null && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {Number(listing.list_price).toLocaleString("en-CA", {
                          style: "currency",
                          currency: "CAD",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Key className="h-4 w-4" />
                      Lockbox: {listing.lockbox_code}
                    </span>
                    {listing.mls_number && <span>MLS# {listing.mls_number}</span>}
                    {listing.showing_window_start && listing.showing_window_end && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {listing.showing_window_start} - {listing.showing_window_end}
                      </span>
                    )}
                    <Link
                      href={`/contacts/${seller.id}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <User className="h-4 w-4" />
                      {seller.name}
                    </Link>
                  </div>
                  {listing.notes && (
                    <p className="text-sm text-muted-foreground">{listing.notes}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Row */}
          <div className="flex flex-wrap gap-2">
            <ShowingRequestForm
              listings={allListings ?? []}
              preselectedListingId={id}
              disabled={hasMissingDocs}
            />
            <ConveyancingPackButton
              address={listing.address}
              documents={(documents ?? []) as ListingDocument[]}
              disabled={hasMissingDocs}
            />
            <NeighborhoodButton address={listing.address} />
          </div>

          {/* Workflow */}
          <Card>
            <CardContent className="p-6">
              <ListingWorkflow
                listing={listing}
                documents={(documents ?? []) as ListingDocument[]}
                formStatuses={formStatuses}
              />
            </CardContent>
          </Card>

          {/* Showing History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Showing History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(showings ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No showings for this listing yet.
                </p>
              )}
              {(showings ?? []).map((showing) => (
                <div
                  key={showing.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {showing.buyer_agent_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(showing.start_time).toLocaleString("en-CA", {
                        timeZone: "America/Vancouver",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      &middot;{" "}
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
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RIGHT PANEL — fixed, own scroll */}
      <aside className="hidden lg:block w-[340px] shrink-0 border-l overflow-y-auto p-6 bg-card/30">
        <FormReadinessPanel
          listingId={id}
          documents={(documents ?? []) as ListingDocument[]}
          listing={listing}
          seller={seller}
          formStatuses={formStatuses}
        />
      </aside>
    </div>
  );
}
