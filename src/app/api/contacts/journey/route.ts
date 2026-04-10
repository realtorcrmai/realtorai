import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function PATCH(req: Request) {
  try {
    const tc = await getAuthenticatedTenantClient();
    const body = await req.json();
    const { journeyId, ...updates } = body;

    if (!journeyId) {
      return NextResponse.json({ error: "journeyId required" }, { status: 400 });
    }

    // Handle remove
    if (updates.remove) {
      const { error } = await tc
        .from("contact_journeys")
        .delete()
        .eq("id", journeyId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, removed: true });
    }

    // Build update object — only include fields that were sent
    const updateData: Record<string, unknown> = {};
    if (updates.is_paused !== undefined) updateData.is_paused = updates.is_paused;
    if (updates.send_mode !== undefined) updateData.send_mode = updates.send_mode;
    if (updates.trust_level !== undefined) updateData.trust_level = updates.trust_level;
    if (updates.current_phase !== undefined) updateData.current_phase = updates.current_phase;
    if (updates.next_email_at !== undefined) updateData.next_email_at = updates.next_email_at;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await tc
      .from("contact_journeys")
      .update(updateData)
      .eq("id", journeyId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
