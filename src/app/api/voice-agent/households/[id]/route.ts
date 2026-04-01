import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const addMemberSchema = z.object({
  contact_id: z.string().uuid(),
});

/**
 * GET /api/voice-agent/households/[id]
 * Single household with all members.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Household ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: household, error } = await supabase
    .from("households")
    .select("id, name, address, notes, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !household) {
    return NextResponse.json({ error: "Household not found" }, { status: 404 });
  }

  const { data: members } = await supabase
    .from("contacts")
    .select("id, name, phone, email, type, stage_bar, lead_status")
    .eq("household_id", id)
    .order("name", { ascending: true });

  return NextResponse.json({
    household: {
      ...household,
      members: members ?? [],
      member_count: members?.length ?? 0,
    },
  });
}

/**
 * PATCH /api/voice-agent/households/[id]
 * Update household name, address, or notes.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Household ID required" }, { status: 400 });
  }

  const body = await req.json();

  // Handle add-member action (body: { action: "add_member", contact_id })
  if (body.action === "add_member") {
    const memberParsed = addMemberSchema.safeParse(body);
    if (!memberParsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: memberParsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: contact, error } = await supabase
      .from("contacts")
      .update({ household_id: id })
      .eq("id", memberParsed.data.contact_id)
      .select("id, name")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, message: `${contact.name} added to household` },
      { status: 200 }
    );
  }

  // Handle remove-member action (body: { action: "remove_member", contact_id })
  if (body.action === "remove_member") {
    const memberParsed = addMemberSchema.safeParse(body);
    if (!memberParsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: memberParsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: contact, error } = await supabase
      .from("contacts")
      .update({ household_id: null })
      .eq("id", memberParsed.data.contact_id)
      .eq("household_id", id)
      .select("id, name")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, message: `${contact.name} removed from household` },
      { status: 200 }
    );
  }

  // Default: update household fields
  const parsed = updateHouseholdSchema.safeParse(body);
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
    .from("households")
    .update(parsed.data)
    .eq("id", id)
    .select("id, name, address, notes, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Household not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, household: data }, { status: 200 });
}

/**
 * DELETE /api/voice-agent/households/[id]
 * Delete household (contacts' household_id is set to null via FK).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Household ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("households").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
