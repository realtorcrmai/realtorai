import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const url = new URL(req.url);
  const months = parseInt(url.searchParams.get("months") || "6");

  const now = new Date();
  const future = new Date();
  future.setMonth(future.getMonth() + months);

  const { data, error } = await tc
    .from("mortgages")
    .select("*, deals(id, title, contact_id, contacts(id, name, phone, email))")
    .gte("renewal_date", now.toISOString().split("T")[0])
    .lte("renewal_date", future.toISOString().split("T")[0])
    .order("renewal_date");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
