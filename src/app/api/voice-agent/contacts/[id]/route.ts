import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const updateContactSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().nullable(),
  type: z.enum(["buyer", "seller", "partner"]).optional(),
  pref_channel: z.enum(["sms", "whatsapp", "email"]).optional(),
  stage_bar: z.string().optional().nullable(),
  lead_status: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/voice-agent/contacts/[id]
 * Single contact with household, relationships count, deals count, communications count.
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
      return NextResponse.json({ error: "Contact ID required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch contact + household in one query
    const { data: contact, error } = await supabase
      .from("contacts")
      .select(`
        *,
        households(id, name, address, notes)
      `)
      .eq("id", id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch counts in parallel
    const [relCount, dealsCount, commsCount] = await Promise.all([
      supabase
        .from("contact_relationships")
        .select("id", { count: "exact", head: true })
        .or(`contact_a_id.eq.${id},contact_b_id.eq.${id}`),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("contact_id", id),
      supabase
        .from("communications")
        .select("id", { count: "exact", head: true })
        .eq("contact_id", id),
    ]);

    return NextResponse.json({
      contact: {
        ...contact,
        _counts: {
          relationships: relCount.count ?? 0,
          deals: dealsCount.count ?? 0,
          communications: commsCount.count ?? 0,
        },
      },
    });
  } catch (err) {
    console.error("[voice-agent] contacts/[id] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/voice-agent/contacts/[id]
 * Update contact fields.
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
      return NextResponse.json({ error: "Contact ID required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateContactSchema.safeParse(body);
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
      .from("contacts")
      .update(parsed.data)
      .eq("id", id)
      .select("id, name, phone, email, type, pref_channel, stage_bar, lead_status, source, notes, tags, updated_at")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, contact: data }, { status: 200 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("[voice-agent] contacts/[id] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/voice-agent/contacts/[id]
 * Delete contact (communications cascade via FK).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Contact ID required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("contacts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[voice-agent] contacts/[id] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
