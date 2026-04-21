import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, DollarSign, Key, Clock, User } from "lucide-react";
import { TrackRecentView } from "@/components/shared/TrackRecentView";
import { ManualStatusOverride } from "@/components/listings/ManualStatusOverride";
import { ListingWorkflow } from "@/components/listings/ListingWorkflow";
import { FormReadinessPanel } from "@/components/listings/FormReadinessPanel";
import { SellerIdentitiesPanel } from "@/components/listings/SellerIdentitiesPanel";
import { BuyerIdentitiesPanel } from "@/components/listings/BuyerIdentitiesPanel";
import { ConveyancingPackButton } from "@/components/listings/ConveyancingPackButton";
import { ShowingRequestForm } from "@/components/showings/ShowingRequestForm";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { ClickToVoiceButton } from "@/components/voice-agent/ClickToVoiceButton";
import { NeighborhoodButton } from "@/components/listings/NeighborhoodButton";
import { PhotoGallery } from "@/components/listings/PhotoGallery";
import { DDFSyncButton } from "@/components/listings/DDFSyncButton";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ListingDocument } from "@/types";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getAuthenticatedTenantClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, contacts!listings_seller_id_fkey(id, name, phone, email)")
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
    { data: buyerMatches },
    { data: sellerIdentities },
    { data: listingPhotos },
    { data: buyerIdentities },
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
    // Buyer match: find active journeys whose price range and property type overlap
    supabase
      .from("buyer_journeys")
      .select("id, contact_id, min_price, max_price, preferred_property_types, preferred_areas, contacts(id, name)")
      .not("status", "in", "(closed,cancelled)")
      .or(
        `max_price.is.null,max_price.gte.${listing.list_price ?? 0}`
      )
      .limit(5),
    // FINTRAC seller identities for the Phase 1 compliance panel.
    // Listing cannot transition to active/pending/sold without ≥1 row.
    supabase
      .from("seller_identities")
      .select("*")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("listing_photos")
      .select("id, photo_url, role, caption, sort_order")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("buyer_identities")
      .select("*")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  // Build form status map for the right panel
  const formStatuses = Object.fromEntries(
    (formSubmissions ?? []).map((s: { form_key: string; status: string }) => [s.form_key, s.status as "draft" | "completed"])
  );

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const docTypes = (documents ?? []).map((d: { doc_type: string }) => d.doc_type);
  const hasMissingDocs = requiredTypes.some((t) => !docTypes.includes(t));

  return (
    <>
    <TrackRecentView id={listing.id} type="listing" label={listing.address} href={`/listings/${listing.id}`} />
    <div className="flex h-full">
      {/* CENTER — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6">
          {hasMissingDocs && (
            <AlertBanner message="Missing Required Documents — Upload FINTRAC, DORTS, and PDS before creating showings or generating conveyancing packs." />
          )}

          {/* Buyer Match Banner */}
          {(buyerMatches ?? []).length > 0 && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 flex items-start gap-3">
              <span className="text-xl shrink-0">🎯</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-teal-800">
                  {(buyerMatches ?? []).length} potential buyer{(buyerMatches ?? []).length !== 1 ? "s" : ""} match this listing
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {(buyerMatches ?? []).map((match: Record<string, unknown>) => {
                    const contact = match.contacts as { id: string; name: string } | null;
                    if (!contact) return null;
                    return (
                      <Link
                        key={match.id as string}
                        href={`/contacts/${contact.id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-medium hover:bg-teal-200 transition-colors"
                      >
                        👤 {contact.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Photo Gallery with Lightbox */}
          <PhotoGallery photos={(listingPhotos ?? []) as any} address={listing.address} />

          {/* Listing Header — compact */}
          <Card className="animate-float-in overflow-hidden border-0 shadow-md">
            {!(listingPhotos ?? []).length && listing.hero_image_url ? (
              <div className="relative h-48 md:h-64 w-full overflow-hidden">
                <img
                  src={`${listing.hero_image_url}&w=1200&h=400&fit=crop`}
                  alt={listing.address}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            ) : (
              <div className="h-1.5 bg-brand" />
            )}
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight truncate">
                      {listing.address}
                    </h1>
                    <ManualStatusOverride
                      listingId={id}
                      currentStatus={listing.status}
                    />
                    <ClickToVoiceButton
                      agentEmail=""
                      focusType="listing"
                      focusId={id}
                      label="Voice"
                      size="sm"
                    />
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
                {/* Seller Profile Button */}
                <Link
                  href={`/contacts/${seller.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors shrink-0"
                >
                  <User className="h-4 w-4" />
                  View Seller
                </Link>
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
            />
            {listing.mls_number && (
              <DDFSyncButton listingId={id} />
            )}
            <NeighborhoodButton address={listing.address} />
          </div>

          {/* Workflow */}
          <Card>
            <CardContent className="p-6">
              <ListingWorkflow
                listing={{ ...listing, seller_name: seller.name }}
                documents={(documents ?? []) as ListingDocument[]}
                formStatuses={formStatuses}
                seller={seller}
                showingsCount={showings?.length ?? 0}
                listingId={id}
                contactId={seller.id}
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
              {(showings ?? []).map((showing: { id: string; buyer_agent_name: string; start_time: string; status: string; created_at: string }) => (
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

        {/* Mobile: collapsible panels (hidden on desktop) */}
        <div className="lg:hidden border-t border-border mt-4">
          <details className="group">
            <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors">
              <span>📋 Documents & Compliance</span>
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="p-4 space-y-4 border-t border-border">
              <SellerIdentitiesPanel
                listingId={id}
                initialIdentities={(sellerIdentities ?? []) as never}
              />
              <BuyerIdentitiesPanel
                listingId={id}
                initialIdentities={(buyerIdentities ?? []) as never}
              />
              <FormReadinessPanel
                listingId={id}
                documents={(documents ?? []) as ListingDocument[]}
                listing={listing}
                seller={seller}
                formStatuses={formStatuses}
              />
            </div>
          </details>
        </div>
      </div>

      {/* Desktop: fixed right panel */}
      <aside className="hidden lg:block w-[340px] shrink-0 border-l overflow-y-auto p-6 bg-card/30 space-y-4">
        <SellerIdentitiesPanel
          listingId={id}
          initialIdentities={(sellerIdentities ?? []) as never}
        />
        <BuyerIdentitiesPanel
          listingId={id}
          initialIdentities={(buyerIdentities ?? []) as never}
        />
        <FormReadinessPanel
          listingId={id}
          documents={(documents ?? []) as ListingDocument[]}
          listing={listing}
          seller={seller}
          formStatuses={formStatuses}
        />
      </aside>
    </div>
    </>
  );
}
