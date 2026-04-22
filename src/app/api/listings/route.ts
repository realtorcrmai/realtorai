import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient, getScopedTenantClient } from "@/lib/supabase/tenant";
import { listingSchema } from "@/lib/schemas";
import type { DataScope } from "@/types/team";

export async function GET(req: NextRequest) {
  let tc;
  const searchParams = req.nextUrl.searchParams;
  try {
    const scope = (searchParams.get("scope") || "personal") as DataScope;
    tc = await getScopedTenantClient(scope);
  } catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const status = searchParams.get("status")?.toLowerCase();
  const search = searchParams.get("search");
  const rawLimit = parseInt(searchParams.get("limit") || "50");
  const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 500);
  const rawPage = parseInt(searchParams.get("page") || "1");
  const page = Number.isNaN(rawPage) ? 1 : Math.max(rawPage, 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = tc
    .from("listings")
    .select("*, contacts!listings_seller_id_fkey(name, phone)", { count: "exact" })
    .is("deleted_at", null)
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
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("[listings GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
  });
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
