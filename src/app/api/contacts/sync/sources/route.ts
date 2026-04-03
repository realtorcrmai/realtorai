import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function GET() {
  try {
    const tc = await getAuthenticatedTenantClient();
    const { data: sources } = await tc
      .from("contact_sync_sources")
      .select("id, provider, provider_account_name, is_active, auto_sync, last_synced_at, total_synced, total_duplicates_merged, sync_error")
      .order("created_at", { ascending: false });

    return NextResponse.json({ sources: sources || [] });
  } catch {
    return NextResponse.json({ sources: [] });
  }
}
