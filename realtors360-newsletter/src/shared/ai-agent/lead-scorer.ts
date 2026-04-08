import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { anthropic, CLAUDE_MODEL } from '../../lib/anthropic.js';
import { createWithRetry } from '../anthropic-retry.js';
import { retrieveContext } from '../rag/retriever.js';
import { logger } from '../../lib/logger.js';

/**
 * Lead scorer — ported from `realestate-crm/src/lib/ai-agent/lead-scorer.ts` (M3-D).
 *
 * Behaviour preserved from CRM original with intentional improvements:
 *
 *   1. All `any` types removed (HC-1). The CRM original used `any` for the
 *      contact row, communications, newsletter events, activity log,
 *      showings, and the parsed Claude JSON. Each is now typed against a
 *      narrow row interface.
 *
 *   2. The `agent_recommendations` insert now goes through `INSERT … catch
 *      SQLSTATE 23505` against the new `uq_agent_recs_pending_advance`
 *      partial unique index (migration 077, MASTER_NEWSLETTER_PLAN.md
 *      §6.4 #2). The index is narrowed to pending advance_stage rows
 *      only, so it eliminates the duplicate pending recommendations the
 *      CRM cron has been creating every 15 minutes for the same
 *      (contact, target_stage) tuple without constraining other
 *      recommendation kinds (greetings, next-best-action mixes, etc).
 *
 *   3. The recommendation insert now writes `realtor_id` explicitly so RLS
 *      stays consistent with HC-14. The CRM original relied on the admin
 *      client bypassing RLS — that worked, but a row without `realtor_id`
 *      would be invisible to the realtor's tenant client, which is the
 *      bug class M3-C caught in `lib/learning-engine.ts`.
 *
 *   4. RAG context comes from the local `shared/rag/retriever.ts` STUB.
 *      M4 will replace the stub with the full hybrid retriever; the call
 *      site here is the M4 acceptance criterion (no further changes
 *      should be needed).
 *
 *   5. Pino structured logging instead of `console.error`.
 *
 * Used by: `crons/agent-scoring.ts` (every 15 minutes, gated on
 * FLAG_AGENT_SCORING).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const VALID_INTENTS = [
  'serious_buyer',
  'active_searcher',
  'window_shopping',
  'investor',
  'dormant',
  'ready_to_sell',
  'considering_selling',
  'not_ready',
] as const;

const PersonalizationHintsSchema = z
  .object({
    tone: z.string().optional(),
    interests: z.array(z.string()).optional(),
    price_anchor: z.string().optional(),
    hot_topic: z.string().optional(),
    avoid: z.string().optional(),
    relationship_stage: z.string().optional(),
    note: z.string().optional(),
  })
  .strict();

export const LeadScoreSchema = z.object({
  buying_readiness: z.number().min(0).max(100),
  timeline_urgency: z.number().min(0).max(100),
  budget_fit: z.number().min(0).max(100),
  intent: z.enum(VALID_INTENTS),
  reasoning: z.string(),
  stage_recommendation: z.enum(['advance', 'maintain', 'downgrade']).optional(),
  new_stage: z.string().optional(),
  personalization_hints: PersonalizationHintsSchema.optional(),
});

export type LeadScore = z.infer<typeof LeadScoreSchema>;

interface ContactRow {
  id: string;
  name: string | null;
  type: string | null;
  email: string | null;
  realtor_id: string | null;
  stage_bar: string | null;
  lead_status: string | null;
  tags: string[] | null;
  buyer_preferences: Record<string, unknown> | null;
  seller_preferences: Record<string, unknown> | null;
  newsletter_intelligence: NewsletterIntelligence | null;
  family_members: unknown;
  created_at: string;
  ai_lead_score: AiLeadScoreRow | null;
}

interface NewsletterIntelligence {
  engagement_score?: number;
  content_preference?: string;
  inferred_interests?: Record<string, unknown>;
  click_history?: Array<{ link_type?: string; clicked_at?: string }>;
}

interface AiLeadScoreRow {
  scored_at?: string;
  [key: string]: unknown;
}

interface CommunicationRow {
  channel: string | null;
  direction: string | null;
  body: string | null;
  created_at: string;
}

interface NewsletterEventRow {
  event_type: string | null;
  link_type: string | null;
  link_url: string | null;
  created_at: string;
}

interface ActivityLogRow {
  activity_type: string | null;
  description: string | null;
  created_at: string;
}

interface AppointmentRow {
  status: string | null;
  start_time: string | null;
}

export interface ScoreBatchResult {
  scored: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCORING_MODEL = process.env.AI_SCORING_MODEL || CLAUDE_MODEL;

const SCORING_SYSTEM_PROMPT = `You are a real estate lead scoring AI for a BC REALTOR CRM.

Analyze the contact's behavioral data and output a JSON lead score. Be specific in your reasoning — cite actual data points (click counts, showing history, engagement patterns).

Rules:
- buying_readiness: 0-100, based on behavioral signals (clicks, showings, engagement)
- timeline_urgency: 0-100, based on click clustering, recency, stated timeline
- budget_fit: 0-100, based on properties viewed vs stated preferences
- intent: categorize their behavior pattern
- stage_recommendation: "advance" if behavioral signals suggest they've moved past their current stage, "maintain" if appropriate, "downgrade" if going dormant
- personalization_hints: tone, interests, hot topics for the newsletter AI

Respond with ONLY valid JSON matching this structure:
{
  "buying_readiness": 75,
  "timeline_urgency": 60,
  "budget_fit": 80,
  "intent": "serious_buyer",
  "reasoning": "Specific reasoning citing data...",
  "stage_recommendation": "advance",
  "new_stage": "qualified",
  "personalization_hints": {
    "tone": "data-driven",
    "interests": ["Kitsilano", "condos"],
    "price_anchor": "$850K",
    "hot_topic": "new listings",
    "avoid": "generic market updates",
    "relationship_stage": "warm",
    "note": "Has school-age children based on school_info clicks"
  }
}`;

// ---------------------------------------------------------------------------
// Public helpers (deterministic — unit-tested)
// ---------------------------------------------------------------------------

/**
 * Pull a JSON object out of Claude's text response. Tries fenced code blocks
 * first, then the first balanced `{...}` substring, then the raw text.
 *
 * Exported for unit tests — the parser is the second-most-common cause of
 * scoring failures (after the API itself), so it gets dedicated coverage.
 */
export function extractJsonString(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return text;
}

/**
 * Build the user-message context block for Claude. Pure function of the row
 * shapes — exported for unit tests so we can lock down the prompt format
 * without invoking Claude.
 */
export function buildScoringContext(
  contact: ContactRow,
  communications: CommunicationRow[],
  newsletterEvents: NewsletterEventRow[],
  showings: AppointmentRow[],
  intel: NewsletterIntelligence
): string {
  const prefs =
    (contact.buyer_preferences as Record<string, unknown> | null) ||
    (contact.seller_preferences as Record<string, unknown> | null) ||
    {};

  const openCount = newsletterEvents.filter((e) => e.event_type === 'opened').length;
  const clickEvents = newsletterEvents.filter((e) => e.event_type === 'clicked');
  const clickCount = clickEvents.length;
  const clickTypes = clickEvents
    .map((e) => e.link_type)
    .filter((t): t is string => !!t);

  const showingCount = showings.length;
  const confirmedShowings = showings.filter((s) => s.status === 'confirmed').length;

  const recentClicks = (intel.click_history ?? [])
    .slice(-5)
    .map((c) => `- ${c.link_type ?? 'unknown'}: ${c.clicked_at ?? 'unknown'}`)
    .join('\n');

  const recentComms = communications
    .slice(0, 5)
    .map(
      (c) =>
        `- ${c.direction ?? 'unknown'} ${c.channel ?? 'unknown'}: "${(c.body ?? '').slice(0, 80)}..." (${c.created_at})`
    )
    .join('\n');

  return `Score this real estate contact:

NAME: ${contact.name ?? 'Unknown'}
TYPE: ${contact.type ?? 'unknown'}
STAGE: ${contact.stage_bar ?? 'new'}
LEAD STATUS: ${contact.lead_status ?? 'new'}
TAGS: ${JSON.stringify(contact.tags ?? [])}
CREATED: ${contact.created_at}

PREFERENCES:
${JSON.stringify(prefs, null, 2)}

LAST 30 DAYS ACTIVITY:
- Emails opened: ${openCount}
- Links clicked: ${clickCount}
- Click types: ${clickTypes.join(', ') || 'none'}
- Showings: ${showingCount} total, ${confirmedShowings} confirmed
- Communications: ${communications.length} messages
- Engagement score: ${intel.engagement_score ?? 0}/100
- Content preference: ${intel.content_preference ?? 'unknown'}
- Inferred interests: ${JSON.stringify(intel.inferred_interests ?? {})}

RECENT CLICKS (last 5):
${recentClicks || 'none'}

RECENT COMMUNICATIONS (last 5):
${recentComms || 'none'}`;
}

// ---------------------------------------------------------------------------
// Scoring entry points
// ---------------------------------------------------------------------------

/**
 * Result of scoring a single contact. Returns the realtor_id alongside the
 * score so `scoreBatch` doesn't need a second SELECT to write a tenant-
 * scoped recommendation row.
 */
export interface ScoreResult {
  score: LeadScore;
  realtorId: string | null;
}

export async function scoreContact(
  db: SupabaseClient,
  contactId: string
): Promise<ScoreResult | null> {
  const { data: contact, error: contactErr } = await db
    .from('contacts')
    .select(
      'id, name, type, email, realtor_id, stage_bar, lead_status, tags, buyer_preferences, seller_preferences, newsletter_intelligence, family_members, created_at, ai_lead_score'
    )
    .eq('id', contactId)
    .single<ContactRow>();

  if (contactErr || !contact) {
    logger.warn({ contactId, err: contactErr }, 'lead-scorer: contact not found');
    return null;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [commsRes, eventsRes, _activitiesRes, showingsRes] = await Promise.all([
    db
      .from('communications')
      .select('channel, direction, body, created_at')
      .eq('contact_id', contactId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('newsletter_events')
      .select('event_type, link_type, link_url, created_at')
      .eq('contact_id', contactId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('activity_log')
      .select('activity_type, description, created_at')
      .eq('contact_id', contactId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('appointments')
      .select('status, start_time')
      .eq('contact_id', contactId)
      .gte('created_at', thirtyDaysAgo),
  ]);

  const communications = (commsRes.data as CommunicationRow[] | null) ?? [];
  const newsletterEvents = (eventsRes.data as NewsletterEventRow[] | null) ?? [];
  const showings = (showingsRes.data as AppointmentRow[] | null) ?? [];

  const intel: NewsletterIntelligence = contact.newsletter_intelligence ?? {};
  const baseContext = buildScoringContext(
    contact,
    communications,
    newsletterEvents,
    showings,
    intel
  );

  // RAG augmentation — full retriever lands in M4. The stub returns an
  // empty `formatted` string, which the lead scorer treats as "no extra
  // context" (same as the CRM original's catch-and-fallthrough branch).
  let ragContext = '';
  try {
    const retrieved = await retrieveContext(
      db,
      `${contact.name ?? 'contact'} engagement history preferences intent`,
      {
        contact_id: contactId,
        content_type: ['message', 'activity', 'email', 'recommendation'],
      },
      5
    );
    if (retrieved.formatted) {
      ragContext = `\n\nADDITIONAL CONTEXT FROM FULL HISTORY:\n${retrieved.formatted}`;
    }
  } catch (err) {
    logger.debug({ contactId, err }, 'lead-scorer: rag retrieval threw, continuing without');
  }

  try {
    const message = await createWithRetry(anthropic, {
      model: SCORING_MODEL,
      max_tokens: 800,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: baseContext + ragContext }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    const jsonStr = extractJsonString(text);
    const parsed: unknown = JSON.parse(jsonStr);
    const score = LeadScoreSchema.parse(parsed);
    return { score, realtorId: contact.realtor_id };
  } catch (err) {
    logger.warn({ contactId, err }, 'lead-scorer: scoring failed');
    return null;
  }
}

export async function scoreBatch(
  db: SupabaseClient,
  contactIds: string[]
): Promise<ScoreBatchResult> {
  let scored = 0;
  let errors = 0;

  for (const contactId of contactIds.slice(0, 50)) {
    try {
      const result = await scoreContact(db, contactId);
      if (!result) {
        errors++;
        continue;
      }
      const { score, realtorId } = result;

      const { error: updateErr } = await db
        .from('contacts')
        .update({
          ai_lead_score: {
            ...score,
            scored_at: new Date().toISOString(),
          },
        })
        .eq('id', contactId);

      if (updateErr) {
        logger.warn({ contactId, err: updateErr }, 'lead-scorer: contact update failed');
      }

      // Stage-advance recommendation: insert + swallow unique-violation
      // (Postgres SQLSTATE 23505) raised by `uq_agent_recs_pending_advance`
      // (migration 077). We can't use `.upsert({onConflict})` here because
      // PostgREST only accepts plain column names in on_conflict — it has
      // no syntax for targeting an expression-based partial index. The
      // catch-and-ignore-23505 pattern is functionally equivalent.
      //
      // We write `realtor_id` explicitly (HC-14) so the row is correctly
      // tenant-scoped. The CRM original omitted this and relied on admin-
      // client RLS bypass; M3-C caught the same bug class in
      // learning-engine and we're tightening it consistently across ports.
      // realtorId comes from the same SELECT scoreContact already ran, so
      // there's no extra round-trip.
      if (score.stage_recommendation === 'advance' && score.new_stage) {
        const insertPayload: Record<string, unknown> = {
          contact_id: contactId,
          action_type: 'advance_stage',
          action_config: { new_stage: score.new_stage },
          reasoning: score.reasoning,
          priority: score.buying_readiness > 70 ? 'hot' : 'warm',
          status: 'pending',
        };
        if (realtorId) {
          insertPayload.realtor_id = realtorId;
        }

        const { error: insertErr } = await db
          .from('agent_recommendations')
          .insert(insertPayload);

        if (insertErr) {
          // 23505 = unique_violation. With migration 077 in place, the
          // partial unique index makes this the expected outcome whenever
          // a pending recommendation already exists for this (contact,
          // action, target_stage) tuple. Log at debug, not warn.
          if (insertErr.code === '23505') {
            logger.debug(
              { contactId, newStage: score.new_stage },
              'lead-scorer: recommendation already pending (idempotent skip)'
            );
          } else {
            logger.warn(
              { contactId, err: insertErr },
              'lead-scorer: recommendation insert failed'
            );
          }
        }
      }

      scored++;
    } catch (err) {
      logger.warn({ contactId, err }, 'lead-scorer: batch iteration threw');
      errors++;
    }

    // Throttle to keep Anthropic happy.
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { scored, errors };
}
