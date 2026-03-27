import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const updateDealSchema = z.object({
  stage: z.string().optional(),
  status: z.enum(["active", "won", "lost"]).optional(),
  value: z.number().optional().nullable(),
  commission_pct: z.number().min(0).max(100).optional().nullable(),
  listing_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500).optional(),
  notes: z.string().optional().nullable(),
  close_date: z.string().optional().nullable(),
  possession_date: z.string().optional().nullable(),
  lost_reason: z.string().optional().nullable(),
});

/**
 * GET /api/voice-agent/deals/[id]
 * Single deal with checklist items, parties, contact name, listing address.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: deal, error } = await supabase
    .from("deals")
    .select(`
      *,
      contacts(id, name, phone, email),
      listings(id, address, status, list_price)
    `)
    .eq("id", id)
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Fetch checklist and parties in parallel
  const [checklistRes, partiesRes] = await Promise.all([
    supabase
      .from("deal_checklist")
      .select("id, item, due_date, completed, completed_at, sort_order")
      .eq("deal_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("deal_parties")
      .select("id, role, name, phone, email, company")
      .eq("deal_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({
    deal: {
      ...deal,
      checklist: checklistRes.data ?? [],
      parties: partiesRes.data ?? [],
    },
  });
}

/**
 * PATCH /api/voice-agent/deals/[id]
 * Update deal stage, status, value, commission_pct, listing_id.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("deals")
    .update(parsed.data)
    .eq("id", id)
    .select("id, title, type, stage, status, value, commission_pct, close_date, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deal: data }, { status: 200 });
}

/**
 * DELETE /api/voice-agent/deals/[id]
 * Delete a deal (checklist and parties cascade via FK).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("deals").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
