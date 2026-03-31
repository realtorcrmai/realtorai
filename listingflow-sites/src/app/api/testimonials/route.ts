import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ testimonials: [] });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true });

  return NextResponse.json({ testimonials: data || [] });
}
