"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

/**
 * Newsletter Engine v3 — read-only viewer actions for the M2-B
 * `/newsletters/engine` page. These read from the tables introduced by
 * migration 074 (`email_event_rules`, `email_events`).
 *
 * If the migration hasn't been applied yet, these actions return an explicit
 * `notReady` flag so the page can render an empty state instead of throwing
 * a 500 from a missing-table error. This is intentional — the page is useful
 * even before the migrations land, and becomes self-validating once they do.
 */

export type NewsletterRule = {
  id: string;
  event_type: string;
  email_type: string;
  template_id: string;
  send_mode: "review" | "auto";
  frequency_cap_per_week: number;
  min_hours_between_sends: number;
  enabled: boolean;
  priority: number;
};

export type RecentEmailEvent = {
  id: string;
  event_type: string;
  status: "pending" | "processed" | "failed" | "ignored";
  contact_id: string | null;
  listing_id: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

export type NewsletterEngineSnapshot = {
  notReady: boolean;
  rules: NewsletterRule[];
  events: RecentEmailEvent[];
  counts: {
    pending: number;
    processed: number;
    failed: number;
    ignored: number;
  };
};

export async function getNewsletterEngineSnapshot(): Promise<NewsletterEngineSnapshot> {
  const tc = await getAuthenticatedTenantClient();

  const empty: NewsletterEngineSnapshot = {
    notReady: false,
    rules: [],
    events: [],
    counts: { pending: 0, processed: 0, failed: 0, ignored: 0 },
  };

  // Rules
  const rulesRes = await tc
    .from("email_event_rules")
    .select(
      "id, event_type, email_type, template_id, send_mode, frequency_cap_per_week, min_hours_between_sends, enabled, priority"
    )
    .order("priority", { ascending: false });

  if (rulesRes.error) {
    if (isMissingTableError(rulesRes.error)) {
      return { ...empty, notReady: true };
    }
    // eslint-disable-next-line no-console
    console.warn("[newsletter-engine] rules query failed:", rulesRes.error.message);
    return empty;
  }

  // Recent events (last 50)
  const eventsRes = await tc
    .from("email_events")
    .select(
      "id, event_type, status, contact_id, listing_id, error_message, created_at, processed_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventsRes.error) {
    if (isMissingTableError(eventsRes.error)) {
      return { ...empty, notReady: true };
    }
    // eslint-disable-next-line no-console
    console.warn("[newsletter-engine] events query failed:", eventsRes.error.message);
    return { ...empty, rules: (rulesRes.data ?? []) as NewsletterRule[] };
  }

  const events = (eventsRes.data ?? []) as RecentEmailEvent[];
  const counts = events.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    { pending: 0, processed: 0, failed: 0, ignored: 0 } as Record<
      RecentEmailEvent["status"],
      number
    >
  );

  return {
    notReady: false,
    rules: (rulesRes.data ?? []) as NewsletterRule[],
    events,
    counts,
  };
}

/**
 * Postgres returns code 42P01 ("undefined_table") when a table doesn't exist.
 * Supabase wraps this in an error with `code: "42P01"` or a message that
 * includes the phrase "does not exist".
 */
function isMissingTableError(err: { code?: string; message?: string }): boolean {
  if (err.code === "42P01") return true;
  if (err.message && /does not exist/i.test(err.message)) return true;
  return false;
}
