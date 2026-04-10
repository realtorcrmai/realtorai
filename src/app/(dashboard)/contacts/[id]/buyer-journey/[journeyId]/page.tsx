import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { BuyerJourneyDetailClient } from "@/components/contacts/BuyerJourneyDetailClient";

export const dynamic = "force-dynamic";

export default async function BuyerJourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string; journeyId: string }>;
}) {
  const { id: contactId, journeyId } = await params;
  const supabase = await getAuthenticatedTenantClient();

  const [
    { data: contact },
    { data: journey },
    { data: properties },
    { data: allListings },
  ] = await Promise.all([
    supabase.from("contacts").select("id, name, type, roles, lifecycle_stage").eq("id", contactId).single(),
    supabase.from("buyer_journeys").select("*").eq("id", journeyId).eq("contact_id", contactId).single(),
    supabase
      .from("buyer_journey_properties")
      .select("*")
      .eq("journey_id", journeyId)
      .order("created_at", { ascending: false }),
    supabase.from("listings").select("id, address, list_price, property_type, status").order("created_at", { ascending: false }),
  ]);

  if (!contact || !journey) notFound();

  const STATUS_LABELS: Record<string, string> = {
    searching:   "🔍 Searching",
    viewing:     "👀 Viewing",
    offer_made:  "📝 Offer Out",
    conditional: "📋 Conditional",
    firm:        "✅ Firm",
    closed:      "🎉 Closed",
    paused:      "⏸️ Paused",
    cancelled:   "❌ Cancelled",
  };

  const j = journey as Record<string, unknown>;
  const priceRange = j.min_price || j.max_price
    ? `$${j.min_price ? ((j.min_price as number) / 1000).toFixed(0) + "K" : "?"} – $${j.max_price ? ((j.max_price as number) / 1000).toFixed(0) + "K" : "?"}`
    : null;

  const c = contact as { id: string; name: string };

  return (
    <div className="overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/50 min-h-full">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Link href="/contacts" className="hover:text-indigo-600">Contacts</Link>
          <span>/</span>
          <Link href={`/contacts/${contactId}`} className="hover:text-indigo-600">{c.name}</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Buyer Journey</span>
        </nav>

        {/* Journey header */}
        <Card className="border border-indigo-200/60 bg-gradient-to-r from-indigo-50/50 to-teal-50/30">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">🔍 Buyer Journey</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{c.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="lf-badge lf-badge-active text-sm px-3 py-1">
                  {STATUS_LABELS[j.status as string] ?? j.status as string}
                </span>
                {priceRange && <span className="text-sm font-semibold text-indigo-700">{priceRange}</span>}
              </div>
            </div>

            {/* Criteria summary */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {!!j.pre_approval_amount && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Pre-approval</span>
                  <span className="font-medium">${(j.pre_approval_amount as number).toLocaleString()}</span>
                </div>
              )}
              {(j.preferred_areas as string[])?.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Preferred areas</span>
                  <span className="font-medium">{(j.preferred_areas as string[]).join(", ")}</span>
                </div>
              )}
              {!!j.min_beds && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Beds</span>
                  <span className="font-medium">{j.min_beds as number}+ bed</span>
                </div>
              )}
              {!!j.urgency && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Urgency</span>
                  <span className="font-medium capitalize">{(j.urgency as string).replace("_", " ")}</span>
                </div>
              )}
              {!!j.target_close_date && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Target close</span>
                  <span className="font-medium">{new Date(j.target_close_date as string).toLocaleDateString("en-CA")}</span>
                </div>
              )}
              {!!j.financing_status && (
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Financing</span>
                  <span className="font-medium capitalize">{j.financing_status as string}</span>
                </div>
              )}
            </div>

            {(j.must_haves as string[])?.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-muted-foreground">Must-haves: </span>
                <span className="text-sm">{(j.must_haves as string[]).join(" · ")}</span>
              </div>
            )}
            {!!j.conditional_on_sale && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                ⚠️ This purchase is conditional on the sale of an existing property.
              </div>
            )}
            {!!j.ai_buyer_score && (
              <div className="mt-2 text-xs text-muted-foreground">
                🎯 AI Buyer Score: <strong className="text-teal-700">{j.ai_buyer_score as number}/100</strong>
                {!!j.ai_summary && <span className="ml-2 text-muted-foreground">{j.ai_summary as string}</span>}
              </div>
            )}
            {!!j.notes && (
              <p className="mt-3 text-xs text-muted-foreground border-t border-gray-100 pt-2">{j.notes as string}</p>
            )}
          </CardContent>
        </Card>

        {/* Client-side interactive section: add property, offer forms, status actions */}
        <BuyerJourneyDetailClient
          journeyId={journeyId}
          contactId={contactId}
          journeyStatus={j.status as string}
          properties={(properties ?? []) as Record<string, unknown>[]}
          allListings={(allListings ?? []) as { id: string; address: string; list_price: number | null; property_type: string }[]}
        />
      </div>
    </div>
  );
}
