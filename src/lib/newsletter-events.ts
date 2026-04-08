/**
 * CRM-side helper for publishing events to the newsletter service.
 *
 * The CRM (Vercel) emits events into the `email_events` Supabase table. The
 * newsletter service (Render — `realtors360-newsletter`) polls that table and
 * processes pending rows asynchronously. We use the table as the durable
 * transport rather than HTTP so that:
 *   1. Vercel's 10s function timeout never blocks the user-facing action
 *   2. RLS enforces tenant isolation
 *   3. Events survive newsletter-service downtime
 *
 * Usage from a server action:
 *   const tc = await getAuthenticatedTenantClient();
 *   ...do the user-facing mutation...
 *   await emitNewsletterEvent(tc, {
 *     event_type: 'listing_price_dropped',
 *     listing_id: listing.id,
 *     contact_id: listing.seller_id,
 *     event_data: { old_price, new_price, seller_id },
 *   });
 *
 * Failures are LOGGED but never thrown — newsletter event publication must
 * never break a user mutation. The compliance trade-off: missed events become
 * an observability problem (we can replay from `activity_log`), not a UX
 * problem.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Minimal shape we need from `getAuthenticatedTenantClient()` — just the
 * raw admin handle (for the table insert) and the realtor id (for the row).
 */
type TenantClient = {
  raw: SupabaseClient;
  realtorId: string;
};

export type NewsletterEventInput = {
  event_type: string;
  event_data?: Record<string, unknown>;
  contact_id?: string | null;
  listing_id?: string | null;
  affected_contact_ids?: string[];
};

export type EmitResult = { ok: true; eventId: string } | { ok: false; reason: string };

/**
 * Inserts a row into `email_events` for the newsletter service to process.
 *
 * Uses the tenant client's raw admin handle (RLS bypass) so the row gets the
 * realtor's id from the tenant context — no risk of cross-tenant leakage.
 */
export async function emitNewsletterEvent(
  tc: TenantClient,
  input: NewsletterEventInput
): Promise<EmitResult> {
  try {
    const { data, error } = await tc.raw
      .from('email_events')
      .insert({
        realtor_id: tc.realtorId,
        event_type: input.event_type,
        event_data: input.event_data ?? {},
        contact_id: input.contact_id ?? null,
        listing_id: input.listing_id ?? null,
        affected_contact_ids: input.affected_contact_ids ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.warn(
        '[newsletter-events] insert failed (non-fatal):',
        input.event_type,
        error?.message ?? 'no row returned'
      );
      return { ok: false, reason: error?.message ?? 'no row returned' };
    }

    return { ok: true, eventId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn('[newsletter-events] threw (non-fatal):', input.event_type, message);
    return { ok: false, reason: message };
  }
}
