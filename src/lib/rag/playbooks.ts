// ============================================================
// Workflow Playbooks — guided conversation flows (A23)
// ============================================================

export interface PlaybookStep {
  prompt: string;
  field: string;
}

export interface Playbook {
  id: string;
  trigger: string;
  triggerPatterns: RegExp[];
  steps: PlaybookStep[];
  onComplete: (data: Record<string, string>) => string;
}

export const PLAYBOOKS: Record<string, Playbook> = {
  new_listing_intake: {
    id: 'new_listing_intake',
    trigger: 'I want to list a new property',
    triggerPatterns: [
      /\b(?:list|new listing|add a listing|create.*listing|list.*property|new property)\b/i,
    ],
    steps: [
      { prompt: "What's the property address?", field: 'address' },
      {
        prompt: 'What type of property is it? (house, condo, townhouse)',
        field: 'property_type',
      },
      { prompt: "What's the expected list price?", field: 'list_price' },
      {
        prompt: 'Who is the seller? (name and phone)',
        field: 'seller_info',
      },
    ],
    onComplete: (data) =>
      `Great! I'll create a listing for ${data.address} (${data.property_type}) at ${data.list_price} for seller ${data.seller_info}. Should I proceed?`,
  },

  showing_request: {
    id: 'showing_request',
    trigger: 'I need to schedule a showing',
    triggerPatterns: [
      /\b(?:schedule.*showing|book.*showing|set up.*showing|showing.*request|book.*viewing)\b/i,
    ],
    steps: [
      { prompt: 'Which listing? (address or search)', field: 'listing' },
      { prompt: 'Buyer agent name?', field: 'agent_name' },
      { prompt: 'Buyer agent phone?', field: 'agent_phone' },
      { prompt: 'Preferred date and time?', field: 'datetime' },
    ],
    onComplete: (data) =>
      `I'll request a showing at ${data.listing} for ${data.agent_name} (${data.agent_phone}) on ${data.datetime}. Confirm?`,
  },

  contact_followup: {
    id: 'contact_followup',
    trigger: 'Help me follow up with a contact',
    triggerPatterns: [
      /\b(?:follow up|followup|follow-up|check in|reach out)\b/i,
    ],
    steps: [
      {
        prompt: 'Which contact? (name or @mention)',
        field: 'contact',
      },
      {
        prompt:
          "What's the context? (showing feedback, general check-in, market update)",
        field: 'context',
      },
    ],
    onComplete: (data) =>
      `I'll draft a ${data.context} follow-up for ${data.contact}. Want me to generate it?`,
  },
};

/**
 * Detect if a message matches a playbook trigger.
 * Returns the playbook ID or null.
 */
export function detectPlaybook(message: string): string | null {
  for (const [id, playbook] of Object.entries(PLAYBOOKS)) {
    for (const pattern of playbook.triggerPatterns) {
      if (pattern.test(message)) return id;
    }
  }
  return null;
}

/**
 * Get the next step in a playbook, or null if complete.
 */
export function getNextStep(
  playbookId: string,
  currentStepIndex: number
): PlaybookStep | null {
  const playbook = PLAYBOOKS[playbookId];
  if (!playbook) return null;

  const nextIndex = currentStepIndex + 1;
  if (nextIndex >= playbook.steps.length) return null;

  return playbook.steps[nextIndex];
}

/**
 * Get the completion message for a playbook.
 */
export function getCompletionMessage(
  playbookId: string,
  collectedData: Record<string, string>
): string | null {
  const playbook = PLAYBOOKS[playbookId];
  if (!playbook) return null;

  return playbook.onComplete(collectedData);
}

/**
 * Check if all steps have been answered.
 */
export function isPlaybookComplete(
  playbookId: string,
  currentStepIndex: number
): boolean {
  const playbook = PLAYBOOKS[playbookId];
  if (!playbook) return true;

  return currentStepIndex >= playbook.steps.length - 1;
}
