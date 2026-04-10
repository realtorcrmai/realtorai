/**
 * Voice Learning System — extracts writing style rules from realtor edits.
 *
 * When a realtor edits an AI-generated draft, this module diffs the original
 * vs edited version, calls Claude to extract actionable writing rules, and
 * persists them into `realtor_agent_config.writing_style_rules` (JSONB array).
 *
 * Those rules are later injected into generation prompts via
 * `orchestrator/prompts.ts → buildVoiceProfileBlock()` so every future email
 * reflects the realtor's voice.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createWithRetry } from '../../shared/anthropic-retry.js';
import { config } from '../../config.js';
import { logger } from '../../lib/logger.js';

/* ─────────────────────────── Types ─────────────────────────── */

/** A single writing style rule extracted from a realtor's edits. */
export type VoiceRule = string;

/** Loaded voice profile ready for prompt injection. */
export type VoiceProfile = {
  /** Raw rule strings from the database. */
  rules: string[];
  /** Pre-formatted block that can be inserted directly into a system prompt. */
  formatted: string;
};

/** Maximum number of voice rules stored per realtor. */
const MAX_RULES = 20;

/* ─────────────────────────── Anthropic Client ─────────────────────────── */

const anthropic = new Anthropic();

/* ─────────────────────────── extractVoiceRules ─────────────────────────── */

const EXTRACTION_SYSTEM_PROMPT = `You analyze how a realtor edited an AI-generated email draft. Extract 1-3 specific, actionable writing rules that capture what the realtor changed and why.

Rules must be:
- Concrete and actionable (a writer can follow them without seeing the original edit)
- About STYLE, not content (voice, tone, structure, word choice, formatting)
- Phrased as instructions: "Always ...", "Never ...", "Use ... instead of ...", "Keep ...", etc.

Examples of good rules:
- "Always use the contact's first name, never full name"
- "End emails with a question, not a statement"
- "Keep paragraphs to 2 sentences max"
- "Never use exclamation marks"
- "Use casual contractions (you're, we'll, don't)"
- "Sign off with just the first name, no title"
- "Avoid real estate jargon — say 'home' not 'property'"

If the edit is trivial (fixing a typo, correcting a fact) and reveals no style preference, return an empty array.

Return ONLY a JSON array of rule strings. No markdown fences, no explanation.`;

/**
 * Calls Claude to analyze the diff between an AI draft and the realtor's
 * edited version, extracting 1-3 writing style rules.
 *
 * Returns an empty array if the edits are trivial or reveal no style preference.
 */
export async function extractVoiceRules(
  originalDraft: string,
  editedVersion: string,
  realtorId: string
): Promise<VoiceRule[]> {
  if (!originalDraft.trim() || !editedVersion.trim()) {
    logger.warn({ realtorId }, 'voice-learner: empty draft or edited version, skipping');
    return [];
  }

  // If texts are identical, no rules to extract
  if (originalDraft.trim() === editedVersion.trim()) {
    return [];
  }

  const userPrompt = `ORIGINAL AI DRAFT:
---
${originalDraft}
---

REALTOR'S EDITED VERSION:
---
${editedVersion}
---

What writing style rules can you extract from how the realtor changed this draft?`;

  try {
    const message = await createWithRetry(anthropic, {
      model: config.AI_SCORING_MODEL,
      max_tokens: 400,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';

    // Parse the JSON array response
    const parsed: unknown = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      logger.warn({ realtorId, response: text }, 'voice-learner: Claude returned non-array');
      return [];
    }

    // Filter to only valid strings, cap at 3
    const rules = parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 3);

    logger.info(
      { realtorId, ruleCount: rules.length },
      'voice-learner: extracted rules'
    );

    return rules;
  } catch (err) {
    logger.error({ err, realtorId }, 'voice-learner: Claude extraction failed');
    return [];
  }
}

/* ─────────────────────────── loadVoiceProfile ─────────────────────────── */

/**
 * Loads the realtor's voice rules from `realtor_agent_config.writing_style_rules`
 * and returns a formatted string block ready for prompt injection.
 *
 * Returns an empty profile (no rules, empty formatted string) if the realtor
 * has no config row or no rules saved.
 */
export async function loadVoiceProfile(
  db: SupabaseClient,
  realtorId: string
): Promise<VoiceProfile> {
  const { data, error } = await db
    .from('realtor_agent_config')
    .select('writing_style_rules')
    .eq('realtor_id', realtorId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, realtorId }, 'voice-learner: failed to load config');
    return { rules: [], formatted: '' };
  }

  if (!data || !data.writing_style_rules) {
    return { rules: [], formatted: '' };
  }

  const raw: unknown = data.writing_style_rules;
  let rules: string[];

  if (Array.isArray(raw)) {
    rules = raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } else if (typeof raw === 'string') {
    // Handle legacy single-string format
    rules = raw.trim().length > 0 ? [raw] : [];
  } else {
    rules = [];
  }

  const formatted =
    rules.length > 0
      ? `## Voice Rules (learned from this realtor's edits)\n${rules.map((r) => `- ${r}`).join('\n')}`
      : '';

  return { rules, formatted };
}

/* ─────────────────────────── saveVoiceRules ─────────────────────────── */

/**
 * Merges new rules into the realtor's existing `writing_style_rules`.
 *
 * Deduplication is case-insensitive. If the merged set exceeds MAX_RULES (20),
 * the oldest rules (at the front of the array) are dropped to make room.
 */
export async function saveVoiceRules(
  db: SupabaseClient,
  realtorId: string,
  rules: string[]
): Promise<void> {
  if (rules.length === 0) return;

  // Load existing rules
  const { data: existing } = await db
    .from('realtor_agent_config')
    .select('writing_style_rules')
    .eq('realtor_id', realtorId)
    .maybeSingle();

  const currentRules: string[] = [];
  if (existing?.writing_style_rules && Array.isArray(existing.writing_style_rules)) {
    for (const item of existing.writing_style_rules) {
      if (typeof item === 'string' && item.trim().length > 0) {
        currentRules.push(item);
      }
    }
  }

  // Deduplicate: normalize to lowercase for comparison, keep original casing
  const seen = new Set(currentRules.map((r) => r.toLowerCase().trim()));
  const newUnique: string[] = [];

  for (const rule of rules) {
    const normalized = rule.toLowerCase().trim();
    if (normalized.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      newUnique.push(rule);
    }
  }

  if (newUnique.length === 0) {
    logger.debug({ realtorId }, 'voice-learner: all rules already exist, skipping save');
    return;
  }

  // Merge: existing + new, then trim to MAX_RULES (drop oldest first)
  const merged = [...currentRules, ...newUnique];
  const trimmed = merged.length > MAX_RULES ? merged.slice(merged.length - MAX_RULES) : merged;

  // Upsert into realtor_agent_config
  const { error } = await db
    .from('realtor_agent_config')
    .upsert(
      {
        realtor_id: realtorId,
        writing_style_rules: trimmed,
      },
      { onConflict: 'realtor_id' }
    );

  if (error) {
    logger.error({ err: error, realtorId }, 'voice-learner: failed to save rules');
    return;
  }

  logger.info(
    { realtorId, added: newUnique.length, total: trimmed.length },
    'voice-learner: saved rules'
  );
}
