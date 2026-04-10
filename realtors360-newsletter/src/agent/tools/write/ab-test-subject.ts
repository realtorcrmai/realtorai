import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const AB_TEST_SUBJECT_SCHEMA: Anthropic.Tool = {
  name: 'ab_test_subject',
  description:
    'A/B test two subject line variants for a draft email. Stores both variants, selects the better one based on the contact\'s engagement history, and records the decision. The realtor can see both options in the approval queue. V1: AI-assisted selection (true split testing comes in v2 with list sends).',
  input_schema: {
    type: 'object',
    properties: {
      draft_id: { type: 'string', description: 'UUID of the existing draft to A/B test' },
      variant_a: { type: 'string', description: 'Subject line variant A' },
      variant_b: { type: 'string', description: 'Subject line variant B' },
    },
    required: ['draft_id', 'variant_a', 'variant_b'],
  },
};

export async function abTestSubject(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const draftId = String(input.draft_id);
  const variantA = String(input.variant_a);
  const variantB = String(input.variant_b);

  // Fetch the draft to get the contact_id
  const { data: draft, error: draftErr } = await ctx.db
    .from('agent_drafts')
    .select('id, contact_id, email_type, subject')
    .eq('id', draftId)
    .eq('realtor_id', ctx.realtorId)
    .maybeSingle();

  if (draftErr) return { error: draftErr.message };
  if (!draft) return { error: `Draft ${draftId} not found` };

  const contactId = draft.contact_id as string;

  // Fetch engagement intel to decide which variant is better
  const { data: contact } = await ctx.db
    .from('contacts')
    .select('newsletter_intelligence')
    .eq('id', contactId)
    .eq('realtor_id', ctx.realtorId)
    .maybeSingle();

  const intel = (contact?.newsletter_intelligence as Record<string, unknown>) ?? {};
  const prefs = (intel.content_preferences as Record<string, unknown>) ?? {};

  // Heuristic: pick variant based on engagement patterns
  // If contact prefers data/market content, pick the more specific subject (longer, more detail)
  // If contact prefers lifestyle/community content, pick the warmer/shorter subject
  const prefersData = Boolean(
    prefs.market_data || prefs.price_trends || prefs.investment
  );
  const aLen = variantA.length;
  const bLen = variantB.length;

  let selectedVariant: 'a' | 'b';
  let selectionReason: string;

  if (prefersData) {
    // Data-oriented contacts prefer specific subjects (typically longer, more detail)
    selectedVariant = aLen >= bLen ? 'a' : 'b';
    selectionReason = 'Contact prefers data-driven content — selected the more specific/detailed subject line.';
  } else {
    // Lifestyle-oriented or unknown contacts prefer warmer, concise subjects
    selectedVariant = aLen <= bLen ? 'a' : 'b';
    selectionReason = 'Contact prefers lifestyle content (or no preference data) — selected the warmer/concise subject line.';
  }

  // If we have click history, check which keywords match past clicked subjects
  const clickHistory = (intel.click_history as Array<Record<string, unknown>>) ?? [];
  if (clickHistory.length >= 3) {
    // Count keyword overlap with each variant
    const pastSubjects = clickHistory
      .map((c) => String(c.subject ?? '').toLowerCase())
      .join(' ');

    const aWords = new Set(variantA.toLowerCase().split(/\s+/));
    const bWords = new Set(variantB.toLowerCase().split(/\s+/));

    let aOverlap = 0;
    let bOverlap = 0;
    for (const word of aWords) {
      if (word.length > 3 && pastSubjects.includes(word)) aOverlap++;
    }
    for (const word of bWords) {
      if (word.length > 3 && pastSubjects.includes(word)) bOverlap++;
    }

    if (aOverlap !== bOverlap) {
      selectedVariant = aOverlap > bOverlap ? 'a' : 'b';
      selectionReason = `Selected based on keyword overlap with ${clickHistory.length} previously clicked emails (variant ${selectedVariant} had more matching terms).`;
    }
  }

  const selectedSubject = selectedVariant === 'a' ? variantA : variantB;

  // Store A/B test record
  const { data: abTest, error: abErr } = await ctx.db
    .from('agent_ab_tests')
    .insert({
      realtor_id: ctx.realtorId,
      contact_id: contactId,
      draft_id: draftId,
      variant_a_subject: variantA,
      variant_b_subject: variantB,
      selected_variant: selectedVariant,
      selection_reason: selectionReason,
    })
    .select('id')
    .single();

  if (abErr) return { error: abErr.message };

  // Update the draft subject to the selected variant + store both in metadata
  const { error: updateErr } = await ctx.db
    .from('agent_drafts')
    .update({
      subject: selectedSubject,
      metadata: {
        ab_test_id: abTest.id,
        variant_a: variantA,
        variant_b: variantB,
        selected_variant: selectedVariant,
        selection_reason: selectionReason,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)
    .eq('realtor_id', ctx.realtorId);

  if (updateErr) return { error: updateErr.message };

  return {
    ab_test_id: abTest.id,
    draft_id: draftId,
    selected_variant: selectedVariant,
    selected_subject: selectedSubject,
    variant_a: variantA,
    variant_b: variantB,
    selection_reason: selectionReason,
  };
}
