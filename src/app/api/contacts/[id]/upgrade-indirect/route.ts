import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

/**
 * POST /api/contacts/[id]/upgrade-indirect
 * Promotes an indirect (auto-created via property partner) contact
 * to a direct client of the realtor.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tc = await getAuthenticatedTenantClient();

  const { data, error } = await tc
    .from("contacts")
    .update({ is_indirect: false, indirect_source: null })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  await tc.from("contact_activities").insert({
    contact_id: id,
    activity_type: "status_change",
    description: "Upgraded from indirect partner to direct client",
    metadata: { previous: "indirect", current: "direct" },
  }).select();

  return NextResponse.json({ ok: true, contact: data });
}
