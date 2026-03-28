import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const createDealSchema = z.object({
  title: z.string().min(1).max(500),
  type: z.string().optional(),
  stage: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  value: z.number().optional(),
  commission_pct: z.number().optional(),
});

/**
 * GET /api/voice-agent/deals
 * List deals with optional filters.
 * Query params: stage, type, contact_id, listing_id, status, limit
 */
export async function GET(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("deals")
    .select(
      "id, title, type, stage, status, contact_id, listing_id, value, commission_pct, created_at, contacts(name), listings(address)"
    )
    .order("created_at", { ascending: false });

  // Filter by stage
  const stage = params.get("stage");
  if (stage) {
    query = query.eq("stage", stage);
  }

  // Filter by type
  const type = params.get("type");
  if (type) {
    query = query.eq("type", type);
  }

  // Filter by status
  const status = params.get("status");
  if (status) {
    query = query.eq("status", status);
  }

  // Filter by contact_id
  const contactId = params.get("contact_id");
  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  // Filter by listing_id
  const listingId = params.get("listing_id");
  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  // Limit
  const limit = params.get("limit");
  query = query.limit(limit ? Number(limit) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deals: data ?? [], count: data?.length ?? 0 });
}

/**
 * POST /api/voice-agent/deals
 * Create a new deal.
 * Body: { title, type?, stage?, contact_id?, listing_id?, value?, commission_pct? }
 */
export async function POST(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();

  const parsed = createDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("deals")
    .insert({
      title: parsed.data.title,
      type: parsed.data.type || null,
      stage: parsed.data.stage || null,
      contact_id: parsed.data.contact_id || null,
      listing_id: parsed.data.listing_id || null,
      value: parsed.data.value ?? null,
      commission_pct: parsed.data.commission_pct ?? null,
    })
    .select("id, title, type, stage, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, title: data.title }, { status: 201 });
}
