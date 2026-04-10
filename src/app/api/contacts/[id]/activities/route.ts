import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await tc
    .from("activity_log")
    .select("id, contact_id, listing_id, activity_type, description, metadata, created_at")
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
