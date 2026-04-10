/**
 * Template variable resolution for workflow step messages.
 *
 * Ported from `realestate-crm/src/lib/workflow-engine.ts` (M3-E).
 * Pure string manipulation — no DB, no side effects, fully testable.
 */

export type ContactVars = {
  name: string;
  phone: string;
  email?: string | null;
};

export type ListingVars = {
  address?: string;
  list_price?: number | null;
  closing_date?: string | null;
};

export type AgentVars = {
  name?: string;
  phone?: string;
  email?: string;
};

/**
 * Build a flat key→value map from contact, listing, and agent data.
 * The keys match `{{variable_name}}` placeholders in message templates.
 */
export function buildVariableContext(
  contact: ContactVars,
  listing?: ListingVars | null,
  agent?: AgentVars | null
): Record<string, string> {
  const firstName = contact.name.split(/\s+/)[0] || contact.name;
  const today = new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const vars: Record<string, string> = {
    contact_name: contact.name,
    contact_first_name: firstName,
    contact_phone: contact.phone,
    contact_email: contact.email || '',
    agent_name: agent?.name || process.env.AGENT_NAME || 'Your Agent',
    agent_phone: agent?.phone || process.env.AGENT_PHONE || '',
    agent_email: agent?.email || process.env.AGENT_EMAIL || '',
    today_date: today,
  };

  if (listing) {
    vars.listing_address = listing.address || '';
    vars.listing_price = listing.list_price
      ? Number(listing.list_price).toLocaleString('en-CA', {
          style: 'currency',
          currency: 'CAD',
          maximumFractionDigits: 0,
        })
      : '';
    vars.closing_date = listing.closing_date
      ? new Date(listing.closing_date).toLocaleDateString('en-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';
  }

  return vars;
}

/**
 * Replace `{{key}}` placeholders with values from a variables map.
 * Unmatched placeholders are left as-is (not stripped).
 */
export function resolveTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}
