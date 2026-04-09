/**
 * Email template registry.
 *
 * Maps `email_type` strings (matching the `email_template_registry` DB seed)
 * to React Email components. Add a new entry here when introducing a new
 * email type so the pipeline runner can render it.
 *
 * M2 reuses `BasicEmail` for all 5 types — the orchestrator's content is the
 * differentiator, not the visual layout. M4 will introduce per-type Premium*
 * components and update this map.
 */

import { BasicEmail, type BasicEmailProps } from './BasicEmail.js';
import type { ComponentType } from 'react';

export type EmailComponent = ComponentType<BasicEmailProps>;

export const EMAIL_REGISTRY: Record<string, EmailComponent> = {
  saved_search_match: BasicEmail,
  listing_price_drop: BasicEmail,
  listing_sold: BasicEmail,
  showing_confirmed: BasicEmail,
  contact_birthday: BasicEmail,
};

export function getEmailComponent(emailType: string): EmailComponent | null {
  return EMAIL_REGISTRY[emailType] ?? null;
}

export { BasicEmail };
export type { BasicEmailProps };
