import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status");

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

  return NextResponse.json(data);
}
