"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { fetchCalendarEvents } from "@/lib/google-calendar";

export async function getCalendarEvents(start: string, end: string) {
  const tc = await getAuthenticatedTenantClient();
  const adminSupabase = createAdminClient();

  // Get Google Calendar events (google_tokens uses user_email, keep admin)
  const { data: tokenData } = await adminSupabase
    .from("google_tokens")
    .select("*")
    .limit(1);

  const tokenRow = tokenData?.[0] ?? null;

  let googleEvents: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: "google";
  }> = [];

  if (tokenRow) {
    try {
      const events = await fetchCalendarEvents(
        tokenRow.user_email,
        new Date(start),
        new Date(end)
      );
      googleEvents = events
        .filter((e) => e.start?.dateTime && e.end?.dateTime)
        .map((e) => ({
          id: e.id ?? crypto.randomUUID(),
          title: e.summary ?? "Busy",
          start: e.start!.dateTime!,
          end: e.end!.dateTime!,
          type: "google" as const,
        }));
    } catch (err) {
      console.warn("Could not fetch Google Calendar events:", err);
    }
  }

  // Get CRM showings
  const { data: showings } = await tc
    .from("appointments")
    .select("*")
    .gte("start_time", start)
    .lte("end_time", end);

  // Fetch listing addresses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const showingsArr = (showings ?? []) as any[];
  const listingIds = [...new Set(showingsArr.map((s) => s.listing_id as string))];
  const { data: listingsData } = listingIds.length > 0
    ? await tc.from("listings").select("id, address").in("id", listingIds)
    : { data: [] as any[] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listingMap = new Map((listingsData ?? []).map((l: any) => [l.id, l.address]));

  const showingEvents = showingsArr.map((s) => ({
    id: s.id,
    title: `Showing: ${listingMap.get(s.listing_id) ?? "Unknown"}`,
    start: s.start_time,
    end: s.end_time,
    type: "showing" as const,
    status: s.status,
    buyerAgentName: s.buyer_agent_name,
    buyerAgentPhone: s.buyer_agent_phone,
    listingId: s.listing_id,
  }));

  return { googleEvents, showingEvents };
}
