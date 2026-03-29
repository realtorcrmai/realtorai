import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

/**
 * GET /api/voice-agent/listings/[id]
 * Fetch a single listing by ID.
 * Query param: ?mode=client to strip internal notes.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();
  const mode = req.nextUrl.searchParams.get("mode");

  const { data, error } = await supabase
    .from("listings")
    .select("*, contacts!listings_seller_id_fkey(name, phone, email)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sanitize for client mode — strip internal/sensitive fields
  if (mode === "client") {
    const { notes, lockbox_code, ...publicData } = data;
    void notes;
    void lockbox_code;
    return NextResponse.json(publicData);
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/voice-agent/listings/[id]
 * Update listing fields: status, list_price, notes (append).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  const body = await req.json();
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};

  // Status update
  if (body.status) {
    const validStatuses = ["active", "pending", "sold", "conditional", "subject_removal", "withdrawn", "expired"];
    if (!validStatuses.includes(body.status.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }
    updates.status = body.status.toLowerCase();
  }

  // Price update
  if (body.list_price !== undefined) {
    updates.list_price = Number(body.list_price);
  }

  // Notes — append with timestamp
  if (body.notes) {
    const { data: existing } = await supabase
      .from("listings")
      .select("notes")
      .eq("id", id)
      .single();

    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const existingNotes = existing?.notes || "";
    updates.notes = existingNotes
      ? `${existingNotes}\n[${timestamp}] ${body.notes}`
      : `[${timestamp}] ${body.notes}`;
  }

  // MLS number
  if (body.mls_number !== undefined) {
    updates.mls_number = body.mls_number;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("listings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, listing: data });
}

/**
 * DELETE /api/voice-agent/listings/[id]
 * Delete a listing by ID.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
