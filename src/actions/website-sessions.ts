"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Get website visitor sessions from analytics events.
 */
export async function getWebsiteSessions(limit = 50, convertedOnly = false) {
  const supabase = createAdminClient();

  // Get all events from last 30 days
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: events } = await supabase
    .from("site_analytics_events")
    .select("session_id, event_type, page_path, device_type, referrer, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(2000);

  if (!events || events.length === 0) return [];

  // Group by session
  const sessions: Record<string, {
    pages: string[];
    events: number;
    device: string;
    referrer: string;
    first: string;
    last: string;
    types: Set<string>;
  }> = {};

  for (const e of events) {
    if (!sessions[e.session_id]) {
      sessions[e.session_id] = {
        pages: [], events: 0, device: e.device_type || "unknown",
        referrer: e.referrer || "", first: e.created_at, last: e.created_at,
        types: new Set(),
      };
    }
    const s = sessions[e.session_id];
    s.events++;
    s.types.add(e.event_type);
    if (e.page_path && !s.pages.includes(e.page_path)) s.pages.push(e.page_path);
    if (e.created_at < s.first) s.first = e.created_at;
    if (e.created_at > s.last) s.last = e.created_at;
  }

  return Object.entries(sessions)
    .map(([id, s]) => ({
      session_id: id,
      pages_visited: s.pages,
      page_count: s.pages.length,
      event_count: s.events,
      device_type: s.device,
      referrer: s.referrer,
      duration_seconds: Math.round((new Date(s.last).getTime() - new Date(s.first).getTime()) / 1000),
      is_converted: s.types.has("form_submit") || s.types.has("newsletter_signup") || s.types.has("booking_submit"),
      has_chat: s.types.has("chat_open") || s.types.has("chat_message"),
      started_at: s.first,
    }))
    .filter(s => !convertedOnly || s.is_converted)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, limit);
}

/**
 * Get website activity for a specific contact.
 * Matches by looking at events around the time the contact was created from a website source.
 */
export async function getContactWebsiteActivity(contactId: string) {
  const supabase = createAdminClient();

  // Get contact info
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, source, created_at")
    .eq("id", contactId)
    .single();

  if (!contact || !contact.source?.startsWith("website")) return null;

  // Find session events around the contact creation time (±5 min)
  const createdAt = new Date(contact.created_at).getTime();
  const windowStart = new Date(createdAt - 5 * 60000).toISOString();
  const windowEnd = new Date(createdAt + 5 * 60000).toISOString();

  const { data: events } = await supabase
    .from("site_analytics_events")
    .select("session_id, event_type, page_path, device_type, referrer, created_at")
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd)
    .order("created_at", { ascending: true })
    .limit(100);

  if (!events || events.length === 0) return null;

  // Find the session that had a form_submit around creation time
  const sessionIds = [...new Set(events.map(e => e.session_id))];

  // Get all events for those sessions (full journey)
  const { data: fullEvents } = await supabase
    .from("site_analytics_events")
    .select("session_id, event_type, page_path, device_type, referrer, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true })
    .limit(200);

  // Build journey per session
  const journeys = sessionIds.map(sid => {
    const sessionEvents = (fullEvents || []).filter(e => e.session_id === sid);
    return {
      session_id: sid,
      pages: sessionEvents.filter(e => e.event_type === "page_view").map(e => ({
        path: e.page_path,
        time: e.created_at,
      })),
      events: sessionEvents.map(e => ({
        type: e.event_type,
        path: e.page_path,
        time: e.created_at,
      })),
      device: sessionEvents[0]?.device_type || "unknown",
      referrer: sessionEvents[0]?.referrer || "Direct",
      duration: sessionEvents.length > 1
        ? Math.round((new Date(sessionEvents[sessionEvents.length - 1].created_at).getTime() - new Date(sessionEvents[0].created_at).getTime()) / 1000)
        : 0,
    };
  });

  return { contact_id: contactId, source: contact.source, journeys };
}
