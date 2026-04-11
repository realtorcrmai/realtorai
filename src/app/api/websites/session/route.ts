import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, corsHeaders, handleCORS, createAdminClient } from "@/lib/website-api";

export async function OPTIONS(request: NextRequest) {
  return handleCORS(request);
}

/**
 * POST /api/websites/session
 * Update session metadata (pages visited, duration, conversion status).
 * Called by SDK on page unload or periodically.
 * Body: { session_id, pages_visited, duration_seconds, is_converted, contact_id?, device_type, referrer }
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) return auth.error!;

  const body = await request.json();
  const { session_id, pages_visited, duration_seconds, is_converted, contact_id, device_type, referrer } = body;

  if (!session_id) {
    return NextResponse.json(
      { error: "session_id is required", code: "VALIDATION" },
      { status: 422, headers: corsHeaders(request) }
    );
  }

  const supabase = createAdminClient();

  // Store session summary as a special analytics event
  await supabase.from("site_analytics_events").insert({
    session_id,
    event_type: "session_summary",
    page_path: (pages_visited || []).join(" → "),
    device_type: device_type || null,
    referrer: referrer || null,
    metadata: {
      pages_visited: pages_visited || [],
      duration_seconds: duration_seconds || 0,
      is_converted: is_converted || false,
      contact_id: contact_id || null,
      page_count: (pages_visited || []).length,
    },
  });

  return NextResponse.json(
    { success: true },
    { headers: corsHeaders(request) }
  );
}

/**
 * GET /api/websites/session
 * List sessions with metadata. Used by CRM dashboard.
 * Query params: limit, offset, converted_only
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid) return auth.error!;

  const supabase = createAdminClient();
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const convertedOnly = url.searchParams.get("converted") === "true";

  // Get session summaries
  let query = supabase
    .from("site_analytics_events")
    .select("session_id, device_type, referrer, metadata, created_at")
    .eq("event_type", "session_summary")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: summaries } = await query;

  // If no summaries, reconstruct from raw events
  if (!summaries || summaries.length === 0) {
    const { data: events } = await supabase
      .from("site_analytics_events")
      .select("session_id, event_type, page_path, device_type, referrer, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    // Group by session
    const sessions: Record<string, { pages: string[]; events: number; device: string; referrer: string; first: string; last: string; types: Set<string> }> = {};
    for (const e of events || []) {
      if (!sessions[e.session_id]) {
        sessions[e.session_id] = { pages: [], events: 0, device: e.device_type || "unknown", referrer: e.referrer || "", first: e.created_at, last: e.created_at, types: new Set() };
      }
      const s = sessions[e.session_id];
      s.events++;
      s.types.add(e.event_type);
      if (e.page_path && !s.pages.includes(e.page_path)) s.pages.push(e.page_path);
      if (e.created_at < s.first) s.first = e.created_at;
      if (e.created_at > s.last) s.last = e.created_at;
    }

    const sessionList = Object.entries(sessions)
      .map(([id, s]) => ({
        session_id: id,
        pages_visited: s.pages,
        page_count: s.pages.length,
        event_count: s.events,
        device_type: s.device,
        referrer: s.referrer,
        duration_seconds: Math.round((new Date(s.last).getTime() - new Date(s.first).getTime()) / 1000),
        is_converted: s.types.has("form_submit") || s.types.has("newsletter_signup") || s.types.has("booking_submit"),
        started_at: s.first,
      }))
      .filter(s => !convertedOnly || s.is_converted)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit);

    return NextResponse.json(sessionList, { headers: corsHeaders(request) });
  }

  const sessionList = (summaries || [])
    .map(s => ({
      session_id: s.session_id,
      pages_visited: (s.metadata as Record<string, unknown>)?.pages_visited || [],
      page_count: (s.metadata as Record<string, unknown>)?.page_count || 0,
      duration_seconds: (s.metadata as Record<string, unknown>)?.duration_seconds || 0,
      is_converted: (s.metadata as Record<string, unknown>)?.is_converted || false,
      contact_id: (s.metadata as Record<string, unknown>)?.contact_id || null,
      device_type: s.device_type,
      referrer: s.referrer,
      started_at: s.created_at,
    }))
    .filter(s => !convertedOnly || s.is_converted);

  return NextResponse.json(sessionList, { headers: corsHeaders(request) });
}
