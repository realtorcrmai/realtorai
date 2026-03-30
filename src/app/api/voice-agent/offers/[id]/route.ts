import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const updateOfferSchema = z.object({
  action: z
    .enum(["accept", "reject", "counter", "withdraw", "submit"])
    .optional(),
  notes: z.string().optional().nullable(),
  offer_amount: z.number().positive().optional(),
  expiry_date: z.string().optional().nullable(),
  closing_date: z.string().optional().nullable(),
  possession_date: z.string().optional().nullable(),
  financing_type: z
    .enum(["conventional", "cash", "fha", "va", "seller_financing", "other"])
    .optional()
    .nullable(),
});

const ACTION_TO_STATUS: Record<string, string> = {
  accept: "accepted",
  reject: "rejected",
  counter: "countered",
  withdraw: "withdrawn",
  submit: "submitted",
};

/**
 * GET /api/voice-agent/offers/[id]
 * Single offer with conditions.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Offer ID required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: offer, error } = await supabase
      .from("offers")
      .select(`
        *,
        contacts!offers_buyer_contact_id_fkey(id, name, phone, email),
        listings(id, address, list_price, status)
      `)
      .eq("id", id)
      .single();

    if (error || !offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const { data: conditions } = await supabase
      .from("offer_conditions")
      .select("id, condition_type, description, status, due_date, satisfied_at, notes")
      .eq("offer_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      offer: {
        ...offer,
        conditions: conditions ?? [],
      },
    });
  } catch (err) {
    console.error("[voice-agent] offers/[id] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/voice-agent/offers/[id]
 * Update offer status via action (accept/reject/counter/withdraw/submit) or update fields.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Offer ID required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify offer exists and get current status
    const { data: existing } = await supabase
      .from("offers")
      .select("id, status")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (parsed.data.notes !== undefined) updatePayload.notes = parsed.data.notes;
    if (parsed.data.offer_amount !== undefined) updatePayload.offer_amount = parsed.data.offer_amount;
    if (parsed.data.expiry_date !== undefined) updatePayload.expiry_date = parsed.data.expiry_date;
    if (parsed.data.closing_date !== undefined) updatePayload.closing_date = parsed.data.closing_date;
    if (parsed.data.possession_date !== undefined) updatePayload.possession_date = parsed.data.possession_date;
    if (parsed.data.financing_type !== undefined) updatePayload.financing_type = parsed.data.financing_type;

    if (parsed.data.action) {
      const newStatus = ACTION_TO_STATUS[parsed.data.action];
      updatePayload.status = newStatus;
      if (parsed.data.action === "submit") {
        updatePayload.submitted_at = new Date().toISOString();
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("offers")
      .update(updatePayload)
      .eq("id", id)
      .select("id, offer_amount, status, notes, submitted_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the status change in offer_history if action was provided
    if (parsed.data.action) {
      await supabase.from("offer_history").insert({
        offer_id: id,
        action: ACTION_TO_STATUS[parsed.data.action] as string,
        from_status: existing.status,
        to_status: ACTION_TO_STATUS[parsed.data.action],
        description: parsed.data.notes ?? `Offer ${parsed.data.action}ed via voice agent`,
        performed_by: "voice_agent",
      });
    }

    return NextResponse.json({ ok: true, offer: data }, { status: 200 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("[voice-agent] offers/[id] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
