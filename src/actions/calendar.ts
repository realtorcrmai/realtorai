"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { fetchCalendarEvents } from "@/lib/google-calendar";

export async function getCalendarEvents(start: string, end: string) {
  const tc = await getAuthenticatedTenantClient();
  const adminSupabase = createAdminClient();

  // Get Google Calendar events scoped to current user
  const { data: tokenData } = await adminSupabase
    .from("google_tokens")
    .select("*")
    .eq("realtor_id", tc.realtorId)
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
   
  const showingsArr = (showings ?? []) as any[];
  const listingIds = [...new Set(showingsArr.map((s) => s.listing_id as string))];
  const { data: listingsData } = listingIds.length > 0
    ? await tc.from("listings").select("id, address").in("id", listingIds)
    : { data: [] as any[] };

   
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

  // Get tasks with due dates in range
  const { data: tasksData } = await tc
    .from("tasks")
    .select("id, title, due_date, priority, status, category")
    .not("due_date", "is", null)
    .gte("due_date", start.split("T")[0])
    .lte("due_date", end.split("T")[0]);

  const taskEvents = (tasksData ?? []).map((t: Record<string, string>) => ({
    id: t.id,
    title: `${t.status === "completed" ? "\u2713 " : ""}${t.title}`,
    start: `${t.due_date}T09:00:00`,
    end: `${t.due_date}T09:30:00`,
    type: "task" as const,
    status: t.status,
    priority: t.priority,
    category: t.category,
  }));

  return { googleEvents, showingEvents, taskEvents };
}
