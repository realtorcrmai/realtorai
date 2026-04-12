/**
 * CASL + CAN-SPAM compliance gate.
 *
 * Ported from `realestate-crm/src/lib/compliance/can-send.ts` (N4).
 * Newsletter service version — same logic, no CRM imports.
 *
 * Every code path that sends commercial email MUST call `canSendToContact`
 * before invoking Resend. CASL (Canada's Anti-Spam Legislation) requires
 * express or implied consent. We enforce the stricter CASL standard for
 * all contacts regardless of country.
 *
 * Also checks the global suppression list (`contact_suppressions` table)
 * so that bounced/suppressed contacts are blocked across all send paths.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isContactSuppressed } from './suppression.js';

export type ContactForConsentCheck = {
  id?: string | null;
  email?: string | null;
  newsletter_unsubscribed?: boolean | null;
  casl_consent_given?: boolean | null;
};

export type CanSendDenialCode = 'no_email' | 'unsubscribed' | 'no_casl_consent' | 'no_contact' | 'suppressed';

export type CanSendResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: CanSendDenialCode };

/**
 * Synchronous compliance check (original signature, no suppression check).
 * Use `canSendToContactAsync` for full checks including suppression list.
 */
export function canSendToContact(
  contact: ContactForConsentCheck | null | undefined,
  options: { skipConsentCheck?: boolean } = {}
): CanSendResult {
  if (!contact) {
    return { allowed: false, reason: 'Contact not found', code: 'no_contact' };
  }
  if (!contact.email || contact.email.trim() === '') {
    return { allowed: false, reason: 'No email address', code: 'no_email' };
  }
  if (contact.newsletter_unsubscribed === true) {
    return { allowed: false, reason: 'Contact has unsubscribed', code: 'unsubscribed' };
  }
  if (!options.skipConsentCheck && contact.casl_consent_given !== true) {
    return { allowed: false, reason: 'No CASL consent', code: 'no_casl_consent' };
  }
  return { allowed: true };
}

/**
 * Async compliance check — includes global suppression list lookup.
 * Preferred over `canSendToContact` when a Supabase client is available.
 */
export async function canSendToContactAsync(
  db: SupabaseClient,
  contact: ContactForConsentCheck | null | undefined,
  options: { skipConsentCheck?: boolean } = {}
): Promise<CanSendResult> {
  // Run the synchronous checks first
  const syncResult = canSendToContact(contact, options);
  if (!syncResult.allowed) {
    return syncResult;
  }

  // Check suppression list
  if (contact?.id) {
    const suppressed = await isContactSuppressed(db, contact.id);
    if (suppressed) {
      return { allowed: false, reason: 'Contact is suppressed', code: 'suppressed' };
    }
  }

  return { allowed: true };
}
