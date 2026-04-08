import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

/**
 * Cron: check-birthdays
 *
 * Schedule: daily at 8 AM Vancouver (registered in `crons/index.ts`).
 *
 * Birthdays live in the `contact_important_dates` table where
 * `date_type = 'birthday'`. Year is ignored — we only match month + day.
 *
 * For every contact whose birthday is today:
 *   1. INSERT an `email_events` row with type `contact_birthday`
 *   2. The worker picks it up and runs the birthday pipeline
 *
 * Idempotency: a per-contact-per-year guard prevents double-emits if the cron
 * runs multiple times in a day. We check for an existing `email_events` row of
 * type `contact_birthday` for the same contact in the current calendar year.
 */
export async function checkBirthdays(): Promise<void> {
  const startedAt = Date.now();
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const day = today.getDate();
  const year = today.getFullYear();
  const yearStart = new Date(year, 0, 1).toISOString();

  // Pull all birthday rows joined to the contact for realtor_id + email + unsub status.
  // M2 scale (≤10k contacts) is fine to filter month/day in-app; M4 will move
  // to a Postgres function with `EXTRACT(MONTH FROM date_value)` for >100k.
  const { data: rows, error } = await supabase
    .from('contact_important_dates')
    .select('contact_id, date_value, contacts!inner(id, realtor_id, name, email, newsletter_unsubscribed)')
    .eq('date_type', 'birthday');

  if (error) {
    logger.error({ err: error }, 'cron/birthdays: query failed');
    return;
  }
  if (!rows || rows.length === 0) {
    logger.debug('cron/birthdays: no birthdays in important_dates');
    return;
  }

  let emitted = 0;
  let skipped = 0;

  type Row = {
    contact_id: string;
    date_value: string;
    contacts: {
      id: string;
      realtor_id: string;
      name: string | null;
      email: string | null;
      newsletter_unsubscribed: boolean | null;
    } | null;
  };

  for (const raw of rows as unknown as Row[]) {
    const contact = raw.contacts;
    if (!contact || !contact.email || contact.newsletter_unsubscribed) {
      continue;
    }
    if (!raw.date_value) continue;

    const bday = new Date(raw.date_value);
    if (bday.getMonth() + 1 !== month || bday.getDate() !== day) continue;

    // Idempotency guard
    const { count: existing } = await supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contact.id)
      .eq('event_type', 'contact_birthday')
      .gte('created_at', yearStart);

    if ((existing ?? 0) > 0) {
      skipped++;
      continue;
    }

    const { error: insertErr } = await supabase.from('email_events').insert({
      realtor_id: contact.realtor_id,
      contact_id: contact.id,
      event_type: 'contact_birthday',
      event_data: {
        contact_id: contact.id,
        birthday: raw.date_value,
        year,
      },
      status: 'pending',
    });

    if (insertErr) {
      logger.error({ err: insertErr, contactId: contact.id }, 'cron/birthdays: emit failed');
      continue;
    }
    emitted++;
  }

  logger.info(
    { rows: rows.length, emitted, skipped, ms: Date.now() - startedAt },
    'cron/birthdays: complete'
  );
}
