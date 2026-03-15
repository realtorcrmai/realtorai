import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

/**
 * GET /api/voice-agent/contacts
 * Find contacts by name, ID, or type.
 * Query params: name (partial match), id, type (buyer/seller)
 */
export async function GET(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  // Filter by ID
  const id = params.get("id");
  if (id) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ contacts: [data], count: 1 });
  }

  // Filter by name (partial match)
  const name = params.get("name");
  if (name) {
    query = query.ilike("name", `%${name}%`);
  }

  // Filter by type
  const type = params.get("type");
  if (type && ["buyer", "seller"].includes(type.toLowerCase())) {
    query = query.eq("type", type.toLowerCase());
  }

  // Limit
  const limit = params.get("limit");
  query = query.limit(limit ? Number(limit) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [], count: data?.length ?? 0 });
}

/**
 * POST /api/voice-agent/contacts
 * Create a new contact (buyer or seller).
 * Body: { name, phone?, email?, type: "buyer"|"seller", notes?, pref_channel? }
 */
export async function POST(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: body.name,
      phone: body.phone || "",
      email: body.email || null,
      type: body.type || "buyer",
      pref_channel: body.pref_channel || "sms",
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, name: data.name }, { status: 201 });
}
