import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const months = parseInt(url.searchParams.get("months") || "6");

  const now = new Date();
  const future = new Date();
  future.setMonth(future.getMonth() + months);

  const { data, error } = await supabase
    .from("mortgages")
    .select("*, deals(id, title, contact_id, contacts(id, name, phone, email))")
    .gte("renewal_date", now.toISOString().split("T")[0])
    .lte("renewal_date", future.toISOString().split("T")[0])
    .order("renewal_date");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
