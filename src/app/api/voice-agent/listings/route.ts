import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

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
