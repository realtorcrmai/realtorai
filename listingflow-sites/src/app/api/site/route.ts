import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("realtor_sites")
    .select("*")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ site: data });
}
