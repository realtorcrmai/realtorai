import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status")?.toLowerCase();

  let query = supabase
    .from("appointments")
    .select("*, listings(address, lockbox_code)")
    .order("start_time", { ascending: false });

  if (
    status &&
    ["requested", "confirmed", "denied", "cancelled"].includes(status)
  ) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
