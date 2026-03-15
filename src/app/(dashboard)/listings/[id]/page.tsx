import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Key, Clock, User } from "lucide-react";
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
      .select("form_key, status, form_data")
      .eq("listing_id", id),
  ]);

  // Build form status map for the right panel
  const formStatuses = Object.fromEntries(
    (formSubmissions ?? []).map((s) => [s.form_key, s.status as "draft" | "completed"])
  );

  // Build step form data map for workflow data panels
  const stepFormData = Object.fromEntries(
    (formSubmissions ?? [])
      .filter((s) => s.form_key.startsWith("step-"))
      .map((s) => [s.form_key, (s.form_data ?? {}) as Record<string, unknown>])
  );

  const requiredTypes = ["FINTRAC", "DORTS", "PDS"];
  const docTypes = (documents ?? []).map((d) => d.doc_type);
  const hasMissingDocs = requiredTypes.some((t) => !docTypes.includes(t));

  // Format price for subtitle
  const formattedPrice =
    listing.list_price != null
      ? Number(listing.list_price).toLocaleString("en-CA", {
          style: "currency",
          currency: "CAD",
          maximumFractionDigits: 0,
        })
      : null;

  // Build subtitle parts
  const subtitleParts: string[] = [];
  if (formattedPrice) subtitleParts.push(formattedPrice);
  if (listing.mls_number) subtitleParts.push(`MLS# ${listing.mls_number}`);
  if (listing.showing_window_start && listing.showing_window_end)
    subtitleParts.push(`${listing.showing_window_start} – ${listing.showing_window_end}`);

  return (
    <div className="flex h-full">
      {/* CENTER — topbar + scrollable content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mid-topbar */}
        <div className="shrink-0 bg-background/90 backdrop-blur-md border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight truncate">
                  {listing.address}
                </h1>
                <Badge
                  variant="secondary"
                  className={`${LISTING_STATUS_COLORS[listing.status as keyof typeof LISTING_STATUS_COLORS]} text-xs shrink-0 capitalize`}
                >
                  {listing.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <span>{subtitleParts.join(" · ")}</span>
                {subtitleParts.length > 0 && <span>&middot;</span>}
                <Link
                  href={`/contacts/${seller.id}`}
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  <User className="h-3.5 w-3.5" />
                  {seller.name}
                </Link>
              </div>
            </div>
          </div>
          {/* Action buttons row */}
          <div className="flex gap-2 mt-2.5">
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
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          <div className="space-y-6">
            {hasMissingDocs && (
              <AlertBanner message="Missing Required Documents — Upload FINTRAC, DORTS, and PDS before creating showings or generating conveyancing packs." />
            )}

            {/* Workflow — no Card wrapper */}
            <ListingWorkflow
              listingId={id}
              listing={{ ...listing, seller_name: seller.name }}
              documents={(documents ?? []) as ListingDocument[]}
              formStatuses={formStatuses}
              seller={seller}
              showingsCount={showings?.length ?? 0}
              stepFormData={stepFormData}
            />

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
      </div>

      {/* RIGHT PANEL — fixed, own scroll */}
      <aside className="hidden lg:block w-[320px] shrink-0 border-l overflow-hidden backdrop-blur-2xl bg-white/80 flex flex-col">
        <FormReadinessPanel
          listingId={id}
          documents={(documents ?? []) as ListingDocument[]}
          listing={listing}
          seller={seller}
          formStatuses={formStatuses}
          showings={showings ?? []}
        />
      </aside>
    </div>
  );
}
