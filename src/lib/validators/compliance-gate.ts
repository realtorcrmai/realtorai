/**
 * Compliance Gate — Sprint 0
 *
 * Checks legal and frequency rules before every email send.
 * CASL (Canada) + CAN-SPAM (USA) compliance.
 * Frequency caps, minimum gaps, quiet hours, bounce checking.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type ComplianceResult = {
  allowed: boolean;
  reason: string | null;
  defer: boolean; // true = send later (frequency/quiet hours), false = block permanently
  deferUntil: string | null; // ISO timestamp if deferred
};

type ComplianceInput = {
  contactId: string;
  contactEmail: string;
  realtorId?: string;
  trustLevel?: number; // 0-3
};

type FrequencyConfig = {
  per_week: number;
  min_gap_hours: number;
};

/**
 * Check if we're allowed to send an email to this contact right now.
 */
export async function checkCompliance(
  input: ComplianceInput
): Promise<ComplianceResult> {
  const supabase = createAdminClient();

  // 1. Check if contact is unsubscribed
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email, newsletter_intelligence, type")
    .eq("id", input.contactId)
    .single();

  if (!contact) {
    return block("Contact not found");
  }

  // Check unsubscribe flag in intelligence
  const intel = contact.newsletter_intelligence as Record<string, unknown> | null;
  if (intel?.unsubscribed === true) {
    return block("Contact has unsubscribed — CASL/CAN-SPAM requires permanent block");
  }

  // 2. Check if contact email has hard-bounced
  const { data: contactNewsletters } = await supabase
    .from("newsletters")
    .select("id")
    .eq("contact_id", input.contactId);

  if (contactNewsletters && contactNewsletters.length > 0) {
    const nlIds = contactNewsletters.map((n: { id: string }) => n.id);
    const { data: bounceEvents } = await supabase
      .from("newsletter_events")
      .select("id")
      .eq("event_type", "bounced")
      .in("newsletter_id", nlIds)
      .limit(1);

    if (bounceEvents && bounceEvents.length > 0) {
      return block("Contact email has previously bounced — delivery will fail");
    }
  }

  // 3. Check consent (CASL for Canada, CAN-SPAM for USA)
  const { data: consent } = await supabase
    .from("consent_records")
    .select("*")
    .eq("contact_id", input.contactId)
    .eq("withdrawn", false)
    .order("consent_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // If consent_records table doesn't exist yet, skip this check (pre-migration)
  if (consent === null) {
    // No consent record — check country
    // For now, allow (consent tracking table may not exist yet)
    // TODO: Once consent table is deployed, make this a hard block for CASL contacts
  } else if (consent) {
    // Check if implied consent has expired
    if (consent.consent_type === "implied" && consent.expiry_date) {
      const expiry = new Date(consent.expiry_date);
      if (expiry < new Date()) {
        return block(
          `Implied consent expired on ${expiry.toISOString().slice(0, 10)} — re-confirmation needed`
        );
      }
    }
  }

  // 4. Check frequency cap (max emails per week)
  const frequencyCap = getFrequencyCap(contact.type);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: sentThisWeek } = await supabase
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", input.contactId)
    .eq("status", "sent")
    .gte("sent_at", sevenDaysAgo);

  if (sentThisWeek !== null && sentThisWeek >= frequencyCap.per_week) {
    const nextWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return defer(
      `Frequency cap reached: ${sentThisWeek}/${frequencyCap.per_week} emails this week`,
      nextWindow.toISOString()
    );
  }

  // 5. Check minimum gap since last email
  const { data: lastSent } = await supabase
    .from("newsletters")
    .select("sent_at")
    .eq("contact_id", input.contactId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSent?.sent_at) {
    const lastSentTime = new Date(lastSent.sent_at).getTime();
    const minGapMs = frequencyCap.min_gap_hours * 60 * 60 * 1000;
    const timeSinceLastMs = Date.now() - lastSentTime;

    if (timeSinceLastMs < minGapMs) {
      const deferTime = new Date(lastSentTime + minGapMs);
      return defer(
        `Minimum gap: last email sent ${Math.round(timeSinceLastMs / 3600000)}h ago, need ${frequencyCap.min_gap_hours}h gap`,
        deferTime.toISOString()
      );
    }
  }

  // 6. Check quiet hours (default: 8 PM - 7 AM local)
  const now = new Date();
  const hour = now.getHours(); // Server timezone — TODO: use realtor's timezone
  if (hour >= 20 || hour < 7) {
    const nextMorning = new Date(now);
    if (hour >= 20) {
      nextMorning.setDate(nextMorning.getDate() + 1);
    }
    nextMorning.setHours(7, 0, 0, 0);
    return defer(
      `Quiet hours: ${hour}:00 is outside send window (7 AM - 8 PM)`,
      nextMorning.toISOString()
    );
  }

  // 7. Check master switch (realtor's sending enabled)
  // TODO: Check realtor_agent_config.sending_enabled once table exists

  // All checks passed
  return { allowed: true, reason: null, defer: false, deferUntil: null };
}

/**
 * Determine trust gate action based on trust level.
 */
export function getTrustGateAction(trustLevel: number): "queue" | "auto_send" {
  // Level 0 (Ghost) and Level 1 (Co-pilot): queue for approval
  // Level 2 (Supervised) and Level 3 (Autonomous): auto-send
  return trustLevel >= 2 ? "auto_send" : "queue";
}

/** Get frequency cap for contact type/phase */
function getFrequencyCap(contactType: string): FrequencyConfig {
  // Default caps — will be overridden by realtor_agent_config when it exists
  const caps: Record<string, FrequencyConfig> = {
    buyer: { per_week: 3, min_gap_hours: 18 },
    seller: { per_week: 2, min_gap_hours: 24 },
    partner: { per_week: 1, min_gap_hours: 72 },
  };
  return caps[contactType] || { per_week: 2, min_gap_hours: 24 };
}

function block(reason: string): ComplianceResult {
  return { allowed: false, reason, defer: false, deferUntil: null };
}

function defer(reason: string, until: string): ComplianceResult {
  return { allowed: false, reason, defer: true, deferUntil: until };
}
