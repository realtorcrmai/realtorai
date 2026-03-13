import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Key, Clock, User } from "lucide-react";
import { DocumentStatusTracker } from "@/components/listings/DocumentStatusTracker";
import { ConveyancingPackButton } from "@/components/listings/ConveyancingPackButton";
import { ShowingRequestForm } from "@/components/showings/ShowingRequestForm";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { NeighborhoodButton } from "@/components/listings/NeighborhoodButton";
import { BCFormsPanel } from "@/components/listings/BCFormsPanel";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ListingDocument } from "@/types";

export const dynamic = "force-dynamic";

const statusColors = {
  active: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  sold: "bg-blue-100 text-blue-800",
};

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

  // Safe type extraction with null check
  const seller = (listing as Record<string, unknown>).contacts as {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;

  if (!seller) notFound();

  const [{ data: documents }, { data: showings }, { data: allListings }] =
    await Promise.all([
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
    ]);

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const docTypes = (documents ?? []).map((d) => d.doc_type);
  const hasMissingDocs = requiredTypes.some((t) => !docTypes.includes(t));

  return (
    <div className="space-y-6">
      {hasMissingDocs && (
        <AlertBanner message="Missing Required Documents — Upload FINTRAC, DORTS, and PDS before creating showings or generating conveyancing packs." />
      )}

      {/* Listing Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-2xl font-bold">{listing.address}</h1>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                    Showings: {listing.showing_window_start} -{" "}
                    {listing.showing_window_end}
                  </span>
                )}
              </div>
              <Link
                href={`/contacts/${seller.id}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-1"
              >
                <User className="h-4 w-4" />
                Seller: {seller.name} ({seller.phone})
              </Link>
              {listing.notes && (
                <p className="text-sm text-muted-foreground mt-2">
                  {listing.notes}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Badge
                variant="secondary"
                className={statusColors[listing.status as keyof typeof statusColors]}
              >
                {listing.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Row */}
      <div className="flex flex-wrap gap-3">
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

      {/* BC Standard Forms */}
      <BCFormsPanel listing={listing} seller={seller} />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Document Tracker */}
        <DocumentStatusTracker
          listingId={id}
          documents={(documents ?? []) as ListingDocument[]}
        />

        {/* Showings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Showing History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
  );
}
