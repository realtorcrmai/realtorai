/**
 * Global Suppression List
 *
 * Contacts in the suppression list are blocked from receiving ANY email.
 * Suppression is triggered automatically after 3 bounces or manually by
 * the realtor. The `canSendToContact` compliance gate checks this table
 * so all send paths respect the suppression list.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';

/**
 * Checks whether a contact is in the global suppression list.
 */
export async function isContactSuppressed(
  db: SupabaseClient,
  contactId: string
): Promise<boolean> {
  const { data, error } = await db
    .from('contact_suppressions')
    .select('id')
    .eq('contact_id', contactId)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn({ err: error, contactId }, 'suppression: lookup failed, treating as not suppressed');
    return false;
  }

  return data !== null;
}

/**
 * Adds a contact to the global suppression list.
 * Uses ON CONFLICT to make this idempotent — suppressing an already-suppressed
 * contact is a no-op.
 */
export async function suppressContact(
  db: SupabaseClient,
  contactId: string,
  realtorId: string,
  reason: string
): Promise<void> {
  const { error } = await db
    .from('contact_suppressions')
    .upsert(
      {
        contact_id: contactId,
        realtor_id: realtorId,
        reason,
        suppressed_at: new Date().toISOString(),
        created_by: 'system',
      },
      { onConflict: 'contact_id' }
    );

  if (error) {
    logger.error({ err: error, contactId, reason }, 'suppression: insert failed');
    throw new Error(`Failed to suppress contact: ${error.message}`);
  }

  logger.info({ contactId, realtorId, reason }, 'suppression: contact suppressed');
}

/**
 * Removes a contact from the global suppression list.
 * No-op if the contact is not suppressed.
 */
export async function unsuppressContact(
  db: SupabaseClient,
  contactId: string
): Promise<void> {
  const { error } = await db
    .from('contact_suppressions')
    .delete()
    .eq('contact_id', contactId);

  if (error) {
    logger.error({ err: error, contactId }, 'suppression: delete failed');
    throw new Error(`Failed to unsuppress contact: ${error.message}`);
  }

  logger.info({ contactId }, 'suppression: contact unsuppressed');
}
