import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { captureException } from '../lib/sentry.js';

/**
 * Cron: check-birthdays
 *
 * Schedule: daily at 8 AM Vancouver (registered in `crons/index.ts`).
 *
 * N7 fix: TOCTOU race eliminated. The old code did SELECT count → INSERT,
 * which under concurrent runs lets both see count=0 and both insert.
 * Now we just INSERT and catch the 23505 unique violation from migration
 * 086's `uq_email_events_birthday_year` index. Same idempotent-skip
 * pattern used across the entire service.
 *
 * P13 fix: birthday date comparison now uses the Vancouver timezone
 * explicitly. The server runs UTC; a birthday stored as `1995-06-15` at
 * PDT midnight is June 16 07:00 UTC. We convert `today` to Vancouver
 * before extracting month + day.
 */
export async function checkBirthdays(): Promise<void> {
  const startedAt = Date.now();

  // P13: use Vancouver timezone for "today" — the cron fires at 8am Vancouver
  // so the date should match the realtor's local calendar, not UTC.
  const vanNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Vancouver' })
  );
  const month = vanNow.getMonth() + 1; // 1-12
  const day = vanNow.getDate();
  const year = vanNow.getFullYear();

  const { data: rows, error } = await supabase
    .from('contact_important_dates')
    .select('contact_id, date_value, contacts!inner(id, realtor_id, name, email, newsletter_unsubscribed)')
    .eq('date_type', 'birthday');

  if (error) {
    logger.error({ err: error }, 'cron/birthdays: query failed');
    captureException(new Error(error.message), { cron: 'check-birthdays' });
    return;
  }
  if (!rows || rows.length === 0) {
    logger.debug('cron/birthdays: no birthdays in important_dates');
    return;
  }

  let emitted = 0;
  let skipped = 0;
  let duplicates = 0;

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
      skipped++;
      continue;
    }
    if (!raw.date_value) {
      skipped++;
      continue;
    }

    // P13: parse date_value as a date-only string, compare month + day.
    // Avoid `new Date(date_value)` which applies timezone offsets to dates
    // that are meant to be timezone-agnostic.
    const [yearStr, monthStr, dayStr] = raw.date_value.split('T')[0].split('-');
    const bdayMonth = parseInt(monthStr, 10);
    const bdayDay = parseInt(dayStr, 10);

    if (bdayMonth !== month || bdayDay !== day) continue;

    // N7 fix: just INSERT and catch the unique violation from migration 086's
    // `uq_email_events_birthday_year` index. No SELECT-before-INSERT race.
    const { error: insertErr } = await supabase.from('email_events').insert({
      realtor_id: contact.realtor_id,
      contact_id: contact.id,
      event_type: 'contact_birthday',
      event_data: {
        contact_id: contact.id,
        birthday: raw.date_value,
        year: String(year),
      },
      status: 'pending',
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        duplicates++;
        continue;
      }
      logger.error({ err: insertErr, contactId: contact.id }, 'cron/birthdays: emit failed');
      continue;
    }
    emitted++;
  }

  logger.info(
    { rows: rows.length, emitted, skipped, duplicates, ms: Date.now() - startedAt },
    'cron/birthdays: complete'
  );
}
