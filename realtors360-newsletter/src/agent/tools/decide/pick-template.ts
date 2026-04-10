import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const PICK_TEMPLATE_SCHEMA: Anthropic.Tool = {
  name: 'pick_template',
  description:
    'Choose the best email template for a contact based on their engagement intelligence and the email type. Returns a template_id and suggested variable overrides.',
  input_schema: {
    type: 'object',
    properties: {
      email_type: { type: 'string', description: 'Type: listing_alert, market_update, just_sold, open_house, neighbourhood_guide, home_anniversary, birthday, price_drop' },
      contact_intel: {
        type: 'object',
        description: 'Contact engagement intelligence (from get_engagement_intel tool)',
      },
    },
    required: ['email_type'],
  },
};

export async function pickTemplate(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const emailType = String(input.email_type);

  // Check email_template_registry for a matching template
  const { data: registry } = await ctx.db
    .from('email_template_registry')
    .select('id, email_type, template_component, description, required_data_fields')
    .eq('email_type', emailType)
    .maybeSingle();

  if (registry) {
    return {
      template_id: registry.id,
      component: registry.template_component,
      email_type: registry.email_type,
      required_fields: registry.required_data_fields ?? [],
    };
  }

  // Fallback: use BasicEmail component with the email_type as context
  return {
    template_id: 'basic',
    component: 'BasicEmail',
    email_type: emailType,
    required_fields: ['subject', 'greeting', 'body_paragraphs', 'cta_label', 'cta_url'],
    note: 'No registered template found — using generic BasicEmail',
  };
}
