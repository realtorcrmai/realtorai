import { NextRequest, NextResponse } from "next/server";
import { getScopedTenantClient } from "@/lib/supabase/tenant";
import type { DataScope } from "@/types/team";

export async function GET(req: NextRequest) {
  let supabase;
  const searchParams = req.nextUrl.searchParams;
  try {
    const scope = (searchParams.get("scope") || "personal") as DataScope;
    supabase = await getScopedTenantClient(scope);
  } catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }
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
