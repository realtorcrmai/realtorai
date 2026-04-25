import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

import { NeighborhoodButton } from "@/components/listings/NeighborhoodButton";
import { PhotoGallery, type Photo } from "@/components/listings/PhotoGallery";
import { DDFSyncButton } from "@/components/listings/DDFSyncButton";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ListingDocument } from "@/types";
import { decryptFields, FINTRAC_ENCRYPTED_FIELDS } from "@/lib/crypto";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  sold: "bg-brand/10 text-brand border-brand/30",
  conditional: "bg-blue-50 text-blue-700 border-blue-200",
  expired: "bg-muted text-muted-foreground border-border",
  withdrawn: "bg-muted text-muted-foreground border-border",
};

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
    supabase
      .from("buyer_journeys")
      .select("id, contact_id, min_price, max_price, preferred_property_types, preferred_areas, contacts(id, name)")
      .not("status", "in", "(closed,cancelled)")
      .or(
        `max_price.is.null,max_price.gte.${listing.list_price ?? 0}`
      )
      .limit(5),
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

  // Decrypt FINTRAC PII for the identity panels (migration 147 / SOC 2 CC6.1).
  // Raw DB values are ciphertext; UI components render plaintext fields
  // (dob, citizenship, id_number, mailing_address) directly.
  const sellerIdentitiesDecrypted = (sellerIdentities ?? []).map(
    (r: Record<string, unknown>) => decryptFields(r, FINTRAC_ENCRYPTED_FIELDS)
  );
  const buyerIdentitiesDecrypted = (buyerIdentities ?? []).map(
    (r: Record<string, unknown>) => decryptFields(r, FINTRAC_ENCRYPTED_FIELDS)
  );

  // Audit: fact-of-access only. Values never leave this scope.
  if (sellerIdentitiesDecrypted.length > 0 || buyerIdentitiesDecrypted.length > 0) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.PII_VIEWED,
      actor: { id: supabase.realtorId },
      tenantId: supabase.realtorId,
      resource: { type: "listing", id },
      metadata: {
        listing_id: id,
        count:
          sellerIdentitiesDecrypted.length + buyerIdentitiesDecrypted.length,
        source: "listings.detail_page",
      },
    });
  }

  const formStatuses = Object.fromEntries(
    (formSubmissions ?? []).map((s: { form_key: string; status: string }) => [s.form_key, s.status as "draft" | "completed"])
  );

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const docTypes = (documents ?? []).map((d: { doc_type: string }) => d.doc_type);
  const hasMissingDocs = requiredTypes.some((t) => !docTypes.includes(t));

  const showingCount = showings?.length ?? 0;
  const confirmedShowings = (showings ?? []).filter((s: { status: string }) => s.status === "confirmed").length;

  // Property detail items for the grid
  const propertyDetails = [
    { label: "Basement", value: listing.basement_type, icon: "🏠" },
    { label: "Heating", value: listing.heating_type, icon: "🔥" },
    { label: "Cooling", value: listing.cooling_type, icon: "❄️" },
    { label: "Roof", value: listing.roof_type, icon: "🏗️" },
    { label: "Exterior", value: listing.exterior_type, icon: "🧱" },
    { label: "Stories", value: listing.stories, icon: "🏢" },
  ].filter((d) => d.value != null);

  const flooringList = (listing.flooring ?? []) as string[];
  const featuresList = (listing.features ?? []) as string[];

  return (
    <>
      <TrackRecentView id={listing.id} type="listing" label={listing.address} href={`/listings/${listing.id}`} />

      <div className="overflow-y-auto h-full">
        {/* Alert Banner */}
        {hasMissingDocs && (
          <div className="px-4 md:px-6 lg:px-8 pt-4">
            <AlertBanner message="Missing Required Documents — Upload FINTRAC, DORTS, and PDS before creating showings or generating conveyancing packs." />
          </div>
        )}

        {/* Photo Gallery — full width */}
        <div className="px-4 md:px-6 lg:px-8 pt-4">
          <PhotoGallery photos={(listingPhotos ?? []) as Photo[]} address={listing.address} />
        </div>

        {/* ── Hero Section ─────────────────────────────── */}
        <div className="px-4 md:px-6 lg:px-8 pt-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left: Address + meta */}
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {listing.address}
                </h1>
                <Badge className={`text-xs font-semibold px-2.5 py-0.5 border ${STATUS_STYLES[listing.status] ?? "bg-muted text-muted-foreground border-border"}`}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </Badge>
                <ManualStatusOverride listingId={id} currentStatus={listing.status} />
                <form action={async () => {
                  "use server";
                  const { toggleListingVisibility } = await import("@/actions/team");
                  await toggleListingVisibility(id);
                }}>
                  <button type="submit" className={`text-xs font-medium px-2 py-0.5 rounded border cursor-pointer ${listing.visibility === "team" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-muted text-muted-foreground border-border"}`}>
                    {listing.visibility === "team" ? "👥 Team" : "🔒 Private"}
                  </button>
                </form>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>{listing.property_type}</span>
                {listing.mls_number && <span>MLS# {listing.mls_number}</span>}
                <Link
                  href={`/contacts/${seller.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  👤 {seller.name}
                </Link>
                <span className="text-xs">
                  Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Right: Price + actions */}
            <div className="flex items-center gap-3 shrink-0">
              {listing.list_price != null && (
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground tracking-tight">
                    {Number(listing.list_price).toLocaleString("en-CA", {
                      style: "currency",
                      currency: "CAD",
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  {listing.sold_price != null && (
                    <p className="text-sm text-success font-medium">
                      Sold: {Number(listing.sold_price).toLocaleString("en-CA", {
                        style: "currency",
                        currency: "CAD",
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Quick Stats Pills ────────────────────────── */}
          <div className="flex flex-wrap gap-3 mt-5">
            {listing.bedrooms != null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-lg">🛏️</span>
                <div>
                  <p className="text-lg font-bold leading-tight">{listing.bedrooms}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Beds</p>
                </div>
              </div>
            )}
            {listing.bathrooms != null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-lg">🛁</span>
                <div>
                  <p className="text-lg font-bold leading-tight">{listing.bathrooms}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Baths</p>
                </div>
              </div>
            )}
            {listing.total_sqft != null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-lg">📐</span>
                <div>
                  <p className="text-lg font-bold leading-tight">{Number(listing.total_sqft).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Sq Ft</p>
                </div>
              </div>
            )}
            {listing.lot_sqft != null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-lg">🌳</span>
                <div>
                  <p className="text-lg font-bold leading-tight">{Number(listing.lot_sqft).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Lot Sq Ft</p>
                </div>
              </div>
            )}
            {listing.year_built != null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-lg font-bold leading-tight">{listing.year_built}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Built</p>
                </div>
              </div>
            )}
            {listing.parking_spaces != null && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-lg">🚗</span>
                <div>
                  <p className="text-lg font-bold leading-tight">{listing.parking_spaces}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Parking</p>
                </div>
              </div>
            )}
            {/* Lockbox */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
              <span className="text-lg">🔑</span>
              <div>
                <p className="text-lg font-bold leading-tight">{listing.lockbox_code}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Lockbox</p>
              </div>
            </div>
            {listing.showing_window_start && listing.showing_window_end && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm">
                <span className="text-lg">🕐</span>
                <div>
                  <p className="text-lg font-bold leading-tight">{listing.showing_window_start}–{listing.showing_window_end}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Showing Window</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Actions Bar ──────────────────────────────── */}
        <div className="px-4 md:px-6 lg:px-8 pt-5">
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
        </div>

        {/* ── Two-Column Content Grid ──────────────────── */}
        <div className="px-4 md:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── LEFT COLUMN (2/3) ──────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Buyer Match Banner */}
              {(buyerMatches ?? []).length > 0 && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 flex items-start gap-3">
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-medium hover:bg-teal-200 transition-colors"
                          >
                            👤 {contact.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Property Details Card */}
              {(propertyDetails.length > 0 || flooringList.length > 0 || featuresList.length > 0 || listing.notes) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">🏡 Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Detail grid */}
                    {propertyDetails.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {propertyDetails.map((d) => (
                          <div key={d.label} className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50">
                            <span className="text-base">{d.icon}</span>
                            <div>
                              <p className="text-xs text-muted-foreground">{d.label}</p>
                              <p className="text-sm font-medium">{d.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {listing.finished_sqft != null && (
                      <div className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50">
                        <span className="text-base">📏</span>
                        <div>
                          <p className="text-xs text-muted-foreground">Finished Area</p>
                          <p className="text-sm font-medium">{Number(listing.finished_sqft).toLocaleString()} sq ft</p>
                        </div>
                      </div>
                    )}

                    {/* Flooring */}
                    {flooringList.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Flooring</p>
                        <div className="flex flex-wrap gap-1.5">
                          {flooringList.map((f) => (
                            <span key={f} className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-foreground">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features */}
                    {featuresList.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Features</p>
                        <div className="flex flex-wrap gap-1.5">
                          {featuresList.map((f) => (
                            <span key={f} className="px-2.5 py-1 rounded-full bg-brand/10 text-xs font-medium text-brand">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {listing.notes && (
                      <div className="p-3 rounded-lg bg-muted/50 border-l-2 border-brand">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Notes</p>
                        <p className="text-sm text-foreground">{listing.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Workflow */}
              <Card>
                <CardContent className="p-6">
                  <ListingWorkflow
                    listing={{ ...listing, seller_name: seller.name }}
                    documents={(documents ?? []) as ListingDocument[]}
                    formStatuses={formStatuses}
                    seller={seller}
                    showingsCount={showingCount}
                    listingId={id}
                    contactId={seller.id}
                  />
                </CardContent>
              </Card>

              {/* Showing History */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">📋 Showing History</CardTitle>
                    {showingCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{showingCount} total</span>
                        <span className="text-xs text-success font-medium">{confirmedShowings} confirmed</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {showingCount === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No showings for this listing yet.
                    </p>
                  )}
                  {(showings ?? []).map((showing: { id: string; buyer_agent_name: string; start_time: string; status: string; created_at: string }) => (
                    <div
                      key={showing.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
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

            {/* ── RIGHT COLUMN (1/3) ─────────────────────── */}
            <div className="space-y-6">

              {/* Seller Card */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{seller.name}</p>
                      <p className="text-xs text-muted-foreground">Seller</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {seller.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>📱</span>
                        <span>{seller.phone}</span>
                      </div>
                    )}
                    {seller.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>📧</span>
                        <span className="truncate">{seller.email}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/contacts/${seller.id}`}
                    className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
                  >
                    View Seller Profile →
                  </Link>
                </CardContent>
              </Card>

              {/* Commission Card */}
              {(listing.commission_rate != null || listing.commission_amount != null) && (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">💰 Commission</p>
                    <div className="space-y-2">
                      {listing.commission_rate != null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Rate</span>
                          <span className="font-medium">{listing.commission_rate}%</span>
                        </div>
                      )}
                      {listing.commission_amount != null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium">
                            {Number(listing.commission_amount).toLocaleString("en-CA", {
                              style: "currency",
                              currency: "CAD",
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Closing Info */}
              {listing.closing_date && (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">📆 Closing</p>
                    <p className="text-sm font-medium">
                      {new Date(listing.closing_date).toLocaleDateString("en-CA", {
                        dateStyle: "long",
                      })}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Seller Identities */}
              <SellerIdentitiesPanel
                listingId={id}
                initialIdentities={sellerIdentitiesDecrypted as never}
              />

              {/* Buyer Identities */}
              <BuyerIdentitiesPanel
                listingId={id}
                initialIdentities={buyerIdentitiesDecrypted as never}
              />

              {/* Form Readiness */}
              <FormReadinessPanel
                listingId={id}
                documents={(documents ?? []) as ListingDocument[]}
                listing={listing}
                seller={seller}
                formStatuses={formStatuses}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
