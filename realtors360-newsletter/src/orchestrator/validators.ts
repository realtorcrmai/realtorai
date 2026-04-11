import { z } from 'zod';

/**
 * Output validators applied to every emitted email before render.
 *
 * Anything that fails here is held for human review and never sent.
 */

export const EmailDraftSchema = z.object({
  status: z.enum(['ready', 'insufficient_data']),
  reason: z.string().optional(),
  subject: z.string().min(3).max(80).optional(),
  preheader: z.string().max(120).optional(),
  greeting: z.string().min(2).max(40).optional(),
  body_paragraphs: z.array(z.string()).min(1).max(4).optional(),
  cta_label: z.string().min(2).max(40).optional(),
  cta_url: z.string().url().optional(),
  signoff: z.string().min(2).max(80).optional(),
});

export type EmailDraft = z.infer<typeof EmailDraftSchema>;

const FORBIDDEN_PHRASES = [
  'as an ai',
  'as a language model',
  'i cannot',
  'lorem ipsum',
  'placeholder',
];

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateDraft(draft: EmailDraft): ValidationResult {
  if (draft.status === 'insufficient_data') {
    return draft.reason ? { ok: true } : { ok: false, reason: 'insufficient_data without reason' };
  }

  if (!draft.subject || !draft.body_paragraphs || !draft.cta_label || !draft.cta_url) {
    return { ok: false, reason: 'missing required fields for ready status' };
  }

  // Word count
  const wordCount = draft.body_paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  if (wordCount > 120) {
    return { ok: false, reason: `body too long (${wordCount} words, max 120)` };
  }

  // Forbidden phrases
  const flat = [draft.subject, ...draft.body_paragraphs].join(' ').toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (flat.includes(phrase)) {
      return { ok: false, reason: `contains forbidden phrase: "${phrase}"` };
    }
  }

  return { ok: true };
}
