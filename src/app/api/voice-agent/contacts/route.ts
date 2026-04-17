import { NextRequest, NextResponse } from "next/server";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { tenantClient } from "@/lib/supabase/tenant";
import { z } from "zod";
import { escapeIlike } from "@/lib/escape-ilike";

const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  type: z.enum(["buyer", "seller", "customer", "agent", "partner", "other"]).optional(),
  pref_channel: z.enum(["sms", "whatsapp", "email"]).optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/voice-agent/contacts
 * Find contacts by name, ID, or type.
 * Query params: name (partial match), id, type (buyer/seller)
 */
export async function GET(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const tc = tenantClient(auth.tenantId);
  const params = req.nextUrl.searchParams;

  let query = tc
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  // Filter by ID
  const id = params.get("id");
  if (id) {
    const { data, error } = await tc
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
    query = query.ilike("name", `%${escapeIlike(name)}%`);
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
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();

  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const tc = tenantClient(auth.tenantId);

  const { data, error } = await tc
    .from("contacts")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone || "",
      email: parsed.data.email || null,
      type: parsed.data.type || "buyer",
      pref_channel: parsed.data.pref_channel || "sms",
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, name: data.name }, { status: 201 });
}
