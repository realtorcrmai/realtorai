/**
 * Drip Sequence Engine
 *
 * Defines drip sequence templates and enrolls contacts into them.
 * Each sequence is an array of steps with day offsets. Enrollment
 * creates rows in `email_events` with `status='scheduled'` and
 * `scheduled_at` based on day offsets from now.
 *
 * The existing `process-scheduled-sends` cron picks them up when
 * their scheduled time arrives.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger.js';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type SequenceTrigger = 'immediate' | 'scheduled' | 'if_no_engagement';

export type SequenceStep = {
  day: number;
  emailType: string;
  trigger: SequenceTrigger;
};

export type SequenceType = 'BUYER_WELCOME' | 'SELLER_ONBOARD';

// ═══════════════════════════════════════════════
// SEQUENCE DEFINITIONS
// ═══════════════════════════════════════════════

export const SEQUENCES: Record<SequenceType, SequenceStep[]> = {
  BUYER_WELCOME: [
    { day: 0, emailType: 'welcome', trigger: 'immediate' },
    { day: 3, emailType: 'neighbourhood_guide', trigger: 'scheduled' },
    { day: 7, emailType: 'listing_alert', trigger: 'scheduled' },
    { day: 14, emailType: 'market_update', trigger: 'scheduled' },
    { day: 30, emailType: 're_engagement', trigger: 'if_no_engagement' },
  ],
  SELLER_ONBOARD: [
    { day: 0, emailType: 'welcome', trigger: 'immediate' },
    { day: 3, emailType: 'seller_report', trigger: 'scheduled' },
    { day: 7, emailType: 'cma_preview', trigger: 'scheduled' },
  ],
};

// ═══════════════════════════════════════════════
// ENROLLMENT
// ═══════════════════════════════════════════════

/**
 * Enrolls a contact into a drip sequence by creating scheduled
 * `email_events` rows for each step.
 *
 * - `immediate` steps are created with `scheduled_at = now()`
 * - `scheduled` steps use the day offset from enrollment time
 * - `if_no_engagement` steps are also scheduled at their day offset;
 *   the worker checks engagement before actually sending
 *
 * @returns The number of steps created
 */
export async function enrollInSequence(
  db: SupabaseClient,
  realtorId: string,
  contactId: string,
  sequenceType: SequenceType
): Promise<number> {
  const steps = SEQUENCES[sequenceType];
  if (!steps) {
    logger.warn({ sequenceType }, 'drip: unknown sequence type');
    return 0;
  }

  // Check for existing enrollment in the same sequence to avoid duplicates
  const { data: existing } = await db
    .from('email_events')
    .select('id')
    .eq('contact_id', contactId)
    .eq('sequence_type', sequenceType)
    .eq('status', 'scheduled')
    .limit(1)
    .maybeSingle();

  if (existing) {
    logger.info(
      { contactId, sequenceType },
      'drip: contact already enrolled in sequence, skipping'
    );
    return 0;
  }

  const now = Date.now();
  const rows = steps.map((step, index) => {
    const scheduledAt = new Date(now + step.day * 24 * 60 * 60 * 1000).toISOString();
    return {
      realtor_id: realtorId,
      contact_id: contactId,
      event_type: step.emailType,
      event_data: {
        trigger: step.trigger,
        sequence_type: sequenceType,
        step_index: index,
      },
      status: 'scheduled',
      scheduled_at: scheduledAt,
      sequence_type: sequenceType,
      sequence_step: index,
    };
  });

  const { error: insertErr } = await db.from('email_events').insert(rows);

  if (insertErr) {
    logger.error(
      { err: insertErr, contactId, sequenceType },
      'drip: failed to enroll contact in sequence'
    );
    return 0;
  }

  logger.info(
    { contactId, sequenceType, steps: rows.length },
    'drip: contact enrolled in sequence'
  );
  return rows.length;
}
