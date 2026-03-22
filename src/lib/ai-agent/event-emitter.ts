import { createAdminClient } from "@/lib/supabase/admin";

type EventType =
  | "listing_created" | "listing_updated" | "listing_sold" | "listing_price_change"
  | "showing_requested" | "showing_confirmed" | "showing_cancelled"
  | "contact_created" | "contact_stage_changed" | "contact_tag_added"
  | "email_sent" | "email_opened" | "email_clicked" | "email_bounced"
  | "high_intent_click" | "engagement_spike"
  | "journey_phase_changed" | "manual_note_added";

export async function emitEvent(
  eventType: EventType,
  contactId: string | null,
  listingId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("agent_events").insert({
      event_type: eventType,
      contact_id: contactId,
      listing_id: listingId,
      payload,
    });
  } catch (err) {
    console.error("[event-emitter] Failed to emit event:", eventType, err);
  }
}

export async function emitListingEvent(
  listingId: string,
  eventType: "listing_created" | "listing_updated" | "listing_sold" | "listing_price_change",
  payload: Record<string, unknown>
): Promise<void> {
  // For listing events, contact_id is null — the evaluator will fan out to matching buyers
  await emitEvent(eventType, null, listingId, payload);
}

export async function emitContactEvent(
  contactId: string,
  eventType: "contact_created" | "contact_stage_changed" | "contact_tag_added",
  payload: Record<string, unknown>
): Promise<void> {
  await emitEvent(eventType, contactId, null, payload);
}

export async function emitEngagementEvent(
  contactId: string,
  eventType: "email_clicked" | "email_opened" | "high_intent_click" | "engagement_spike",
  payload: Record<string, unknown>
): Promise<void> {
  await emitEvent(eventType, contactId, null, payload);
}

export async function emitShowingEvent(
  contactId: string,
  listingId: string | null,
  eventType: "showing_requested" | "showing_confirmed" | "showing_cancelled",
  payload: Record<string, unknown>
): Promise<void> {
  await emitEvent(eventType, contactId, listingId, payload);
}
