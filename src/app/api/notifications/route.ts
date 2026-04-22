import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

export async function GET(req: NextRequest) {
  try {
    const tc = await getAuthenticatedTenantClient();
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20") || 20, 100);
    const unread = url.searchParams.get("unread") === "true";

    let query = tc
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unread) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
