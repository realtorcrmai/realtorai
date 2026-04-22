import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient, getScopedTenantClient } from "@/lib/supabase/tenant";
import type { DataScope } from "@/types/team";
import { requireAuth } from "@/lib/api-auth";
import { contactSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const searchParams = req.nextUrl.searchParams;
  const scope = (searchParams.get("scope") || "personal") as DataScope;
  const supabase = await getScopedTenantClient(scope);
  const search = searchParams.get("search");
  const type = searchParams.get("type")?.toLowerCase();
  const typesParam = searchParams.get("types"); // comma-separated: e.g. "agent,partner"
  const hasEmail = searchParams.get("hasEmail") === "true";
  const countOnly = searchParams.get("countOnly") === "true";
  const rawLimit = parseInt(searchParams.get("limit") || "200");
  const limit = Number.isNaN(rawLimit) ? 200 : Math.min(Math.max(rawLimit, 1), 500);

  const VALID_TYPES = ["buyer", "seller", "customer", "agent", "partner", "other"];

  // countOnly=true returns { count: N } without fetching full rows
  if (countOnly) {
    let countQuery = supabase.from("contacts").select("id", { count: "exact", head: true });
    if (typesParam) {
      const types = typesParam.split(",").map(t => t.trim().toLowerCase()).filter(t => VALID_TYPES.includes(t));
      if (types.length > 0) countQuery = countQuery.in("type", types);
    } else if (type && VALID_TYPES.includes(type)) {
      countQuery = countQuery.eq("type", type);
    }
    if (hasEmail) countQuery = countQuery.not("email", "is", null);
    const { count, error } = await countQuery;
    if (error) return NextResponse.json({ error: "Failed to count contacts" }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  }

  let query = supabase.from("contacts").select("*").order("created_at", { ascending: false });

  if (search) {
    // Sanitize: strip characters that could break PostgREST filter syntax
    const sanitized = search.replace(/[,().*%\\'"/]/g, "");
    if (sanitized.length > 0) {
      query = query.or(`name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
    }
  }
  if (typesParam) {
    const types = typesParam.split(",").map(t => t.trim().toLowerCase()).filter(t => VALID_TYPES.includes(t));
    if (types.length > 0) query = query.in("type", types);
  } else if (type && VALID_TYPES.includes(type)) {
    query = query.eq("type", type);
  }
  if (hasEmail) query = query.not("email", "is", null);

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("[contacts GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

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
      // Default CASL consent to true — realtor collected verbal/written consent at intake.
      // Contacts can be opted-out individually via the contact detail page.
      casl_consent_given: parsed.data.casl_consent_given ?? true,
      casl_consent_date: parsed.data.casl_consent_date ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[contacts POST]", error.message);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
