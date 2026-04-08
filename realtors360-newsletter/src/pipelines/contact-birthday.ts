import { buildBirthdayUserPrompt } from '../orchestrator/prompts.js';
import { runPipeline, type EventRow, type PipelineResult } from './_runner.js';

/**
 * Contact-birthday pipeline.
 *
 * Triggered by: cron `check-birthdays` (newsletter service, daily at 8am).
 * Recipient: the contact whose birthday it is.
 */
export async function runContactBirthday(event: EventRow): Promise<PipelineResult> {
  return runPipeline(event, {
    eventType: 'contact_birthday',
    resolveRecipientContactId: (e) =>
      e.contact_id ?? (e.event_data.contact_id as string | undefined) ?? null,
    buildPrompt: async ({ contact, realtor }) => {
      return buildBirthdayUserPrompt({
        contactFirstName: (contact.name ?? '').split(' ')[0] || 'friend',
        realtorName: realtor.name ?? 'Your agent',
      });
    },
  });
}
