import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, corsHeaders, handleCORS, createAdminClient } from "@/lib/website-api";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

/**
 * GET /api/websites/listings
 * Public API: returns active listings as JSON.
 * Query params: type, area, minPrice, maxPrice, limit, offset
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) return auth.error!;

  const supabase = createAdminClient();
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const area = url.searchParams.get("area");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let query = supabase
    .from("listings")
    .select("id, address, list_price, status, mls_number, prop_type, hero_image_url, mls_remarks, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("prop_type", type);
  if (area) query = query.ilike("address", `%${area}%`);
  if (minPrice) query = query.gte("list_price", parseInt(minPrice));
  if (maxPrice) query = query.lte("list_price", parseInt(maxPrice));

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch listings", code: "DB_ERROR" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  return NextResponse.json(data || [], {
    headers: {
      ...corsHeaders(request),
      "Cache-Control": "public, max-age=300", // 5 min cache
    },
  });
}
