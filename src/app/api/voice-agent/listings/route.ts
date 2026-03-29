import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod/v4";

/**
 * GET /api/voice-agent/listings
 * Search listings with optional filters.
 * Query params: address, mls_number, min_price, max_price, status
 */
export async function GET(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("listings")
    .select("*, contacts!listings_seller_id_fkey(name, phone, email)")
    .order("created_at", { ascending: false });

  // Filter by address (partial match)
  const address = params.get("address");
  if (address) {
    query = query.ilike("address", `%${address}%`);
  }

  // Filter by MLS number
  const mls = params.get("mls_number");
  if (mls) {
    query = query.eq("mls_number", mls);
  }

  // Filter by status
  const status = params.get("status");
  if (status && ["active", "pending", "sold", "conditional", "subject_removal", "withdrawn", "expired"].includes(status.toLowerCase())) {
    query = query.eq("status", status.toLowerCase());
  }

  // Filter by price range
  const minPrice = params.get("min_price");
  if (minPrice) {
    query = query.gte("list_price", Number(minPrice));
  }
  const maxPrice = params.get("max_price");
  if (maxPrice) {
    query = query.lte("list_price", Number(maxPrice));
  }

  // Limit results
  const limit = params.get("limit");
  query = query.limit(limit ? Number(limit) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [], count: data?.length ?? 0 });
}

const createListingSchema = z.object({
  address: z.string().min(1),
  seller_id: z.string().uuid().optional(),
  list_price: z.number().optional(),
  status: z.enum(["active", "pending", "sold", "conditional", "subject_removal", "withdrawn", "expired"]).optional(),
  property_type: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqft: z.number().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/voice-agent/listings
 * Create a new listing.
 * Body: { address, seller_id?, list_price?, status?, property_type?, bedrooms?, bathrooms?, sqft?, notes? }
 */
export async function POST(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("listings")
    .insert({
      address: parsed.data.address,
      seller_id: parsed.data.seller_id || null,
      list_price: parsed.data.list_price || null,
      status: parsed.data.status || "active",
      property_type: parsed.data.property_type || null,
      bedrooms: parsed.data.bedrooms || null,
      bathrooms: parsed.data.bathrooms || null,
      sqft: parsed.data.sqft || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, address: data.address }, { status: 201 });
}
