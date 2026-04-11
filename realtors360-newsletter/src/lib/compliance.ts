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
 */

export type ContactForConsentCheck = {
  id?: string | null;
  email?: string | null;
  newsletter_unsubscribed?: boolean | null;
  casl_consent_given?: boolean | null;
};

export type CanSendDenialCode = 'no_email' | 'unsubscribed' | 'no_casl_consent' | 'no_contact';

export type CanSendResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: CanSendDenialCode };

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
