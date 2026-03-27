import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, corsHeaders, handleCORS, createAdminClient } from "@/lib/website-api";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

/**
 * POST /api/websites/analytics
 * Receive analytics events from the website SDK.
 * Body: { events: [{ event_type, page_url, referrer, utm_source, utm_medium, utm_campaign, device_type, session_id, metadata }] }
 * Or single event: { event_type, page_url, ... }
 */
export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.valid) return auth.error!;

  const body = await request.json();

  // Accept single event or batch
  const events = Array.isArray(body.events) ? body.events : [body];

  if (events.length === 0) {
    return NextResponse.json(
      { error: "No events provided", code: "VALIDATION" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  // Cap batch size
  if (events.length > 100) {
    return NextResponse.json(
      { error: "Max 100 events per batch", code: "BATCH_LIMIT" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  const supabase = createAdminClient();

  const rows = events.map((e: Record<string, unknown>) => ({
    session_id: (e.session_id as string) || "unknown",
    event_type: (e.event_type as string) || "page_view",
    page_path: (e.page_url as string) || (e.page_path as string) || null,
    referrer: (e.referrer as string) || null,
    device_type: (e.device_type as string) || null,
    user_agent: (e.user_agent as string) || null,
    listing_id: (e.listing_id as string) || null,
  }));

  const { error } = await supabase.from("site_analytics_events").insert(rows);

  if (error) {
    return NextResponse.json(
      { error: "Failed to store events", code: "DB_ERROR" },
      { status: 500, headers: corsHeaders(request) }
    );
  }

  return NextResponse.json(
    { success: true, stored: rows.length },
    { status: 200, headers: corsHeaders(request) }
  );
}
