import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { listingSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status")?.toLowerCase();
  const search = searchParams.get("search");
  const rawLimit = parseInt(searchParams.get("limit") || "200");
  const limit = Number.isNaN(rawLimit) ? 200 : Math.min(Math.max(rawLimit, 1), 500);

  let query = tc
    .from("listings")
    .select("*, contacts!listings_seller_id_fkey(name, phone)")
    .order("created_at", { ascending: false });

  if (search) {
    const safe = search.replace(/[,().*%\\'"/]/g, "");
    if (safe.length > 0) {
      query = query.or(`address.ilike.%${safe}%,mls_number.ilike.%${safe}%`);
    }
  }
  if (status && ["active", "pending", "sold", "expired", "withdrawn", "conditional"].includes(status)) {
    query = query.eq("status", status);
  }
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("[listings GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 }); }

  const parsed = listingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await tc
    .from("listings")
    .insert({
      ...parsed.data,
      list_price: parsed.data.list_price ?? null,
      mls_number: parsed.data.mls_number || null,
      showing_window_start: parsed.data.showing_window_start || null,
      showing_window_end: parsed.data.showing_window_end || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[listings POST]", error.message);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
