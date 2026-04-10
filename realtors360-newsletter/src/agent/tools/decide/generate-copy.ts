import type Anthropic from '@anthropic-ai/sdk';
import AnthropicSdk from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';
import { createWithRetry } from '../../../shared/anthropic-retry.js';
import { logger } from '../../../lib/logger.js';

const anthropic = new AnthropicSdk();

export const GENERATE_COPY_SCHEMA: Anthropic.Tool = {
  name: 'generate_copy',
  description:
    'Generate email copy (subject, body paragraphs, CTA) using Claude. Provide the email type, contact context, and any relevant listing/market data. Returns ready-to-send content.',
  input_schema: {
    type: 'object',
    properties: {
      email_type: { type: 'string', description: 'Type of email to generate' },
      contact_context: { type: 'string', description: 'Summary of who this contact is and their preferences (from get_contact and get_engagement_intel)' },
      data_context: { type: 'string', description: 'Relevant data: listing details, market stats, RAG context, etc.' },
      tone: { type: 'string', description: 'Tone: warm, professional, casual, urgent. Default: warm.' },
    },
    required: ['email_type', 'contact_context'],
  },
};

export async function generateCopy(
  _ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const emailType = String(input.email_type);
  const contactContext = String(input.contact_context);
  const dataContext = String(input.data_context || '');
  const tone = String(input.tone || 'warm');

  const prompt = `You are writing a real estate newsletter email for a BC realtor. Generate the email content.

EMAIL TYPE: ${emailType}
TONE: ${tone}

CONTACT CONTEXT:
${contactContext}

${dataContext ? `RELEVANT DATA:\n${dataContext}\n` : ''}

Generate the following as JSON:
{
  "subject": "Email subject line, under 60 characters",
  "preheader": "Preview text for inbox, under 100 characters",
  "greeting": "Personalized greeting, e.g. 'Hi Alex,'",
  "body_paragraphs": ["1-3 short paragraphs, total under 120 words"],
  "cta_label": "Button text, e.g. 'View Listings'",
  "cta_url": "Button URL or placeholder",
  "signoff": "Sign-off, e.g. 'Talk soon, — Sarah'"
}

Return ONLY valid JSON, no markdown fences.`;

  try {
    const message = await createWithRetry(anthropic, {
      model: process.env.AI_SCORING_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';

    try {
      return JSON.parse(text);
    } catch {
      return { subject: emailType, greeting: 'Hi,', body_paragraphs: [text], cta_label: 'Learn More', cta_url: '#', signoff: 'Best regards' };
    }
  } catch (err) {
    logger.error({ err, emailType }, 'generate_copy: Claude call failed');
    return { error: 'Failed to generate copy', details: String(err) };
  }
}
