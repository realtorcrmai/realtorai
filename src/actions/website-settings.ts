"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

/**
 * Get or create the realtor's website integration config.
 */
export async function getWebsiteConfig() {
  const supabase = createAdminClient();

  // Get first site (single-tenant for now)
  const { data: site } = await supabase
    .from("realtor_sites")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!site) {
    // Create a default site config
    const apiKey = "lf_" + randomBytes(16).toString("hex");
    const { data: newSite } = await supabase
      .from("realtor_sites")
      .insert({
        agent_name: "Demo Realtor",
        email: "demo@listingflow.com",
        brokerage_name: "RE/MAX City Realty",
        subdomain: "demo",
      })
      .select("*")
      .single();

    return { site: newSite, apiKey };
  }

  return { site };
}

/**
 * Get website analytics summary.
 */
export async function getWebsiteAnalytics(days = 30) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [
    { data: events, count: totalEvents },
    { data: todayEvents },
    { data: weekEvents },
  ] = await Promise.all([
    supabase
      .from("site_analytics_events")
      .select("event_type, page_path, device_type, referrer, session_id, created_at", { count: "exact" })
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("site_analytics_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from("site_analytics_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  // Compute stats
  const allEvents = events || [];
  const sessions = new Set(allEvents.map(e => e.session_id));
  const pageViews = allEvents.filter(e => e.event_type === "page_view");

  // Top pages
  const pageCounts: Record<string, number> = {};
  for (const e of pageViews) {
    const p = e.page_path || "/";
    pageCounts[p] = (pageCounts[p] || 0) + 1;
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  // Device breakdown
  const devices: Record<string, number> = {};
  for (const e of allEvents) {
    const d = e.device_type || "unknown";
    devices[d] = (devices[d] || 0) + 1;
  }

  // Referrer breakdown
  const referrers: Record<string, number> = {};
  for (const e of pageViews) {
    let r = "Direct";
    if (e.referrer) {
      try { r = new URL(e.referrer).hostname || "Direct"; } catch { r = e.referrer.slice(0, 30); }
    }
    referrers[r] = (referrers[r] || 0) + 1;
  }
  const topReferrers = Object.entries(referrers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  // Daily visitors (last 30 days)
  const daily: Record<string, Set<string>> = {};
  for (const e of allEvents) {
    const day = e.created_at.slice(0, 10);
    if (!daily[day]) daily[day] = new Set();
    daily[day].add(e.session_id);
  }
  const dailyVisitors = Object.entries(daily)
    .map(([date, s]) => ({ date, visitors: s.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Event type counts (for funnel)
  const typeCounts: Record<string, number> = {};
  for (const e of allEvents) {
    typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
  }

  // Lead funnel
  const funnelPageViews = typeCounts["page_view"] || 0;
  const funnelFormStarts = typeCounts["form_start"] || 0;
  const funnelFormSubmits = (typeCounts["form_submit"] || 0) + (typeCounts["newsletter_signup"] || 0) + (typeCounts["booking_submit"] || 0) + (typeCounts["valuation_request"] || 0);
  const funnelChatOpens = typeCounts["chat_open"] || 0;
  const funnelChatMessages = typeCounts["chat_message"] || 0;

  // Website-sourced leads count
  const { count: websiteLeadCount } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .like("source", "website%")
    .gte("created_at", since);

  // Avg session duration (rough: time between first and last event per session)
  const sessionTimes: Record<string, { first: number; last: number }> = {};
  for (const e of allEvents) {
    const t = new Date(e.created_at).getTime();
    if (!sessionTimes[e.session_id]) sessionTimes[e.session_id] = { first: t, last: t };
    if (t < sessionTimes[e.session_id].first) sessionTimes[e.session_id].first = t;
    if (t > sessionTimes[e.session_id].last) sessionTimes[e.session_id].last = t;
  }
  const durations = Object.values(sessionTimes).map(s => (s.last - s.first) / 1000).filter(d => d > 0);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Bounce rate (sessions with only 1 event)
  const sessionEventCounts: Record<string, number> = {};
  for (const e of allEvents) {
    sessionEventCounts[e.session_id] = (sessionEventCounts[e.session_id] || 0) + 1;
  }
  const bounced = Object.values(sessionEventCounts).filter(c => c <= 1).length;
  const bounceRate = sessions.size > 0 ? Math.round((bounced / sessions.size) * 100) : 0;

  return {
    totalEvents: totalEvents || 0,
    totalSessions: sessions.size,
    todayEvents: todayEvents || 0,
    weekEvents: weekEvents || 0,
    topPages,
    devices,
    topReferrers,
    dailyVisitors,
    typeCounts,
    funnel: {
      pageViews: funnelPageViews,
      formStarts: funnelFormStarts,
      formSubmits: funnelFormSubmits,
      chatOpens: funnelChatOpens,
      chatMessages: funnelChatMessages,
      leadsCreated: websiteLeadCount || 0,
    },
    avgDuration,
    bounceRate,
  };
}

/**
 * Get website-sourced leads.
 */
export async function getWebsiteLeads(limit = 50) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("contacts")
    .select("id, name, email, phone, type, source, lead_status, stage_bar, created_at")
    .like("source", "website%")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Generate a new API key.
 */
export async function generateApiKey() {
  const key = "lf_" + randomBytes(16).toString("hex");
  revalidatePath("/websites");
  return key;
}
