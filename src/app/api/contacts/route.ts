import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { requireAuth } from "@/lib/api-auth";
import { contactSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = await getAuthenticatedTenantClient();
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search");
  const type = searchParams.get("type")?.toLowerCase();
  const rawLimit = parseInt(searchParams.get("limit") || "200");
  const limit = Number.isNaN(rawLimit) ? 200 : Math.min(Math.max(rawLimit, 1), 500);

  let query = supabase.from("contacts").select("*").order("created_at", { ascending: false });

  if (search) {
    // Sanitize: strip characters that could break PostgREST filter syntax
    const sanitized = search.replace(/[,().*%\\'"/]/g, "");
    if (sanitized.length > 0) {
      query = query.or(`name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
    }
  }
  if (type && ["buyer", "seller", "customer", "agent", "partner", "other"].includes(type)) {
    query = query.eq("type", type);
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = await getAuthenticatedTenantClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
