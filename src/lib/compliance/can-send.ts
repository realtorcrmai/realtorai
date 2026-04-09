/**
 * Central "can we legally email this contact?" gate.
 *
 * Every code path that sends commercial email to a contact MUST call
 * `canSendToContact` (or `assertCanSend`) before invoking Resend.
 *
 * CASL (Canada's Anti-Spam Legislation, SC 2010, c. 23) requires:
 *  1. Express or implied consent before sending commercial electronic
 *     messages. We track this via `contacts.casl_consent_given`.
 *  2. A functional unsubscribe mechanism. We track the state via
 *     `contacts.newsletter_unsubscribed`.
 *  3. Consent to be revocable with immediate effect. Unsubscribe flips
 *     `newsletter_unsubscribed=true` and the send path must respect it
 *     within at most 10 business days (we respect it immediately).
 *
 * CAN-SPAM (15 U.S.C. §§ 7701–7713, USA) has similar but weaker rules:
 *  - Unsubscribe must be honoured within 10 business days
 *  - No consent requirement (opt-out model, not opt-in)
 *  - This function enforces the stricter CASL standard for all contacts
 *    regardless of country, because the CRM's primary market is BC.
 *
 * Exception: transactional emails (password reset, showing confirmation
 * TO THE ACTING PARTY, order receipts) are exempt from consent under
 * CASL §6(6). The caller should use `skipConsentCheck: true` ONLY for
 * genuinely transactional sends. See the JSDoc on `CanSendOptions`.
 *
 * History:
 * - Before 2026-04-09, CASL consent was inconsistently checked across
 *   6 different send paths. 3 paths checked `newsletter_unsubscribed`
 *   only. 2 paths checked neither. 0 paths checked `casl_consent_given`.
 *   This was a legal compliance gap surfaced by the QA audit.
 * - This file introduces a single point of enforcement. All 6 paths
 *   were updated to call it.
 */

export type ContactForConsentCheck = {
  id?: string | null;
  email?: string | null;
  newsletter_unsubscribed?: boolean | null;
  casl_consent_given?: boolean | null;
  casl_consent_date?: string | null;
  casl_opt_out_date?: string | null;
};

export type CanSendOptions = {
  /**
   * Set to true ONLY for transactional messages that CASL exempts from
   * consent requirements (§6(6)): order receipts, password resets, direct
   * responses to a party's own action (e.g. confirming their own showing
   * booking TO THEM).
   *
   * Never set this for marketing content, newsletters, prospecting, or
   * messages to third parties about someone else's transaction.
   */
  skipConsentCheck?: boolean;
};

export type CanSendResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: CanSendDenialCode };

export type CanSendDenialCode =
  | 'no_email'
  | 'unsubscribed'
  | 'no_casl_consent'
  | 'no_contact';

/**
 * Return whether it is legal + safe to send a commercial email to this
 * contact right now. Pure function, no side effects.
 */
export function canSendToContact(
  contact: ContactForConsentCheck | null | undefined,
  options: CanSendOptions = {}
): CanSendResult {
  if (!contact) {
    return { allowed: false, reason: 'Contact not found', code: 'no_contact' };
  }

  if (!contact.email || contact.email.trim() === '') {
    return { allowed: false, reason: 'Contact has no email address', code: 'no_email' };
  }

  // Unsubscribe is ALWAYS enforced, even for transactional mail. A contact
  // who has opted out cannot be emailed regardless of the message type —
  // Resend's sender reputation depends on honouring unsubscribes.
  if (contact.newsletter_unsubscribed === true) {
    return {
      allowed: false,
      reason: 'Contact has unsubscribed from all communications',
      code: 'unsubscribed',
    };
  }

  // CASL consent is skipped ONLY for transactional sends.
  if (options.skipConsentCheck) {
    return { allowed: true };
  }

  if (contact.casl_consent_given !== true) {
    return {
      allowed: false,
      reason: 'Contact has not granted CASL consent for commercial email',
      code: 'no_casl_consent',
    };
  }

  return { allowed: true };
}

/**
 * Throw if the contact cannot be emailed. Useful for server actions that
 * want to fail loudly rather than silently skip.
 */
export class CanSendError extends Error {
  public readonly code: CanSendDenialCode;
  constructor(result: Extract<CanSendResult, { allowed: false }>) {
    super(`Cannot send to contact: ${result.reason}`);
    this.name = 'CanSendError';
    this.code = result.code;
  }
}

export function assertCanSend(
  contact: ContactForConsentCheck | null | undefined,
  options: CanSendOptions = {}
): asserts contact is ContactForConsentCheck & { email: string } {
  const result = canSendToContact(contact, options);
  if (!result.allowed) {
    throw new CanSendError(result);
  }
}

/**
 * Filter a list of contacts down to those who can receive commercial
 * email. Use this in bulk-send paths (campaigns, listing blasts).
 */
export function filterSendable<T extends ContactForConsentCheck>(
  contacts: T[],
  options: CanSendOptions = {}
): { sendable: T[]; skipped: Array<{ contact: T; reason: string; code: CanSendDenialCode }> } {
  const sendable: T[] = [];
  const skipped: Array<{ contact: T; reason: string; code: CanSendDenialCode }> = [];

  for (const contact of contacts) {
    const result = canSendToContact(contact, options);
    if (result.allowed) {
      sendable.push(contact);
    } else {
      skipped.push({ contact, reason: result.reason, code: result.code });
    }
  }

  return { sendable, skipped };
}
