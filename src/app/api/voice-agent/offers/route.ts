import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const createOfferSchema = z.object({
  listing_id: z.string().uuid(),
  buyer_contact_id: z.string().uuid(),
  offer_amount: z.number().positive(),
  status: z
    .enum(["draft", "submitted", "countered", "accepted", "rejected", "withdrawn", "expired", "cancelled"])
    .optional()
    .default("draft"),
  expiry_date: z.string().optional().nullable(),
  financing_type: z
    .enum(["conventional", "cash", "fha", "va", "seller_financing", "other"])
    .optional()
    .nullable(),
  deposit_amount: z.number().optional().nullable(),
  conditions_text: z.string().optional().nullable(),
  possession_date: z.string().optional().nullable(),
  closing_date: z.string().optional().nullable(),
  earnest_money: z.number().optional().nullable(),
  down_payment: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/voice-agent/offers
 * List offers with filters. Joins buyer contact name + listing address.
 * Query params: listing_id, status, buyer_contact_id, limit
 */
export async function GET(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("offers")
    .select(`
      id, offer_amount, earnest_money, down_payment, status,
      is_counter_offer, parent_offer_id,
      submitted_at, expiry_date, closing_date, possession_date,
      financing_type, notes, created_at, updated_at,
      listing_id, buyer_contact_id, seller_contact_id,
      contacts!offers_buyer_contact_id_fkey(id, name, phone, email),
      listings(id, address, list_price, status)
    `)
    .order("created_at", { ascending: false });

  const listingId = params.get("listing_id");
  if (listingId) query = query.eq("listing_id", listingId);

  const status = params.get("status");
  if (status) query = query.eq("status", status);

  const buyerContactId = params.get("buyer_contact_id");
  if (buyerContactId) query = query.eq("buyer_contact_id", buyerContactId);

  const limit = params.get("limit");
  query = query.limit(limit ? Math.min(Number(limit), 100) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offers: data ?? [], count: data?.length ?? 0 });
}

/**
 * POST /api/voice-agent/offers
 * Create a new offer.
 */
export async function POST(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify listing exists
  const { data: listing } = await supabase
    .from("listings")
    .select("id, address, seller_id")
    .eq("id", parsed.data.listing_id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 400 });
  }

  // Verify buyer contact exists
  const { data: buyer } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("id", parsed.data.buyer_contact_id)
    .single();

  if (!buyer) {
    return NextResponse.json({ error: "Buyer contact not found" }, { status: 400 });
  }

  const insertData: Record<string, unknown> = {
    listing_id: parsed.data.listing_id,
    buyer_contact_id: parsed.data.buyer_contact_id,
    seller_contact_id: listing.seller_id ?? null,
    offer_amount: parsed.data.offer_amount,
    status: parsed.data.status,
    expiry_date: parsed.data.expiry_date ?? null,
    financing_type: parsed.data.financing_type ?? null,
    earnest_money: parsed.data.earnest_money ?? null,
    down_payment: parsed.data.down_payment ?? null,
    possession_date: parsed.data.possession_date ?? null,
    closing_date: parsed.data.closing_date ?? null,
    notes: parsed.data.notes ?? null,
    submitted_at: parsed.data.status === "submitted" ? new Date().toISOString() : null,
  };

  const { data: offer, error } = await supabase
    .from("offers")
    .insert(insertData)
    .select("id, offer_amount, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If conditions_text provided, create an "other" condition
  if (parsed.data.conditions_text) {
    await supabase.from("offer_conditions").insert({
      offer_id: offer.id,
      condition_type: "other",
      description: parsed.data.conditions_text,
      status: "pending",
    });
  }

  return NextResponse.json(
    {
      ok: true,
      id: offer.id,
      offer_amount: offer.offer_amount,
      status: offer.status,
      listing_address: listing.address,
      buyer_name: buyer.name,
    },
    { status: 201 }
  );
}
