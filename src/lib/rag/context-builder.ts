// ============================================================
// Context Builder — Hierarchical context scoping (A18)
// Assembles context in priority order with token budgets.
// ============================================================

import { estimateTokens } from './constants';
import type { UIContext } from './types';

/** Token budgets per context level */
const TOKEN_BUDGETS = {
  selection: 500,
  record: 1500,
  page: 500,
  global: 500,
} as const;

const MAX_TOTAL_TOKENS = 3000;

export interface ContextLevel {
  priority: number;
  label: string;
  content: string;
  tokenBudget: number;
  actualTokens: number;
}

export interface HierarchicalContext {
  levels: ContextLevel[];
  formatted: string;
  totalTokens: number;
}

/**
 * Truncate text to fit within a token budget.
 * Rough: 1 token ~ 4 chars.
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + '...';
}

/**
 * Build hierarchical context in priority order:
 * 1. Selection context (highest) — user-selected text
 * 2. Record context — current entity data
 * 3. Page context — what page the user is on
 * 4. Global context — user preferences, voice rules
 *
 * Lower-priority levels are truncated if total exceeds MAX_TOTAL_TOKENS.
 */
export function buildHierarchicalContext(params: {
  selectionText?: string;
  recordData?: string;
  uiContext: UIContext;
  voiceRules?: string[];
  tonePreference?: string;
}): HierarchicalContext {
  const levels: ContextLevel[] = [];

  // Level 1: Selection context (highest priority)
  if (params.selectionText?.trim()) {
    const content = truncateToTokens(params.selectionText.trim(), TOKEN_BUDGETS.selection);
    levels.push({
      priority: 1,
      label: 'SELECTED TEXT',
      content,
      tokenBudget: TOKEN_BUDGETS.selection,
      actualTokens: estimateTokens(content),
    });
  }

  // Level 2: Record context — current entity data
  if (params.recordData?.trim()) {
    const content = truncateToTokens(params.recordData.trim(), TOKEN_BUDGETS.record);
    levels.push({
      priority: 2,
      label: 'CURRENT RECORD',
      content,
      tokenBudget: TOKEN_BUDGETS.record,
      actualTokens: estimateTokens(content),
    });
  }

  // Level 3: Page context
  const pageInfo = buildPageContext(params.uiContext);
  if (pageInfo) {
    const content = truncateToTokens(pageInfo, TOKEN_BUDGETS.page);
    levels.push({
      priority: 3,
      label: 'PAGE CONTEXT',
      content,
      tokenBudget: TOKEN_BUDGETS.page,
      actualTokens: estimateTokens(content),
    });
  }

  // Level 4: Global context (lowest priority)
  const globalInfo = buildGlobalContext(params.voiceRules, params.tonePreference);
  if (globalInfo) {
    const content = truncateToTokens(globalInfo, TOKEN_BUDGETS.global);
    levels.push({
      priority: 4,
      label: 'PREFERENCES',
      content,
      tokenBudget: TOKEN_BUDGETS.global,
      actualTokens: estimateTokens(content),
    });
  }

  // Enforce total token budget — truncate lower-priority levels first
  let totalTokens = levels.reduce((sum, l) => sum + l.actualTokens, 0);

  if (totalTokens > MAX_TOTAL_TOKENS) {
    // Iterate from lowest priority and truncate
    for (let i = levels.length - 1; i >= 0 && totalTokens > MAX_TOTAL_TOKENS; i--) {
      const excess = totalTokens - MAX_TOTAL_TOKENS;
      const level = levels[i];
      const reduceBy = Math.min(excess, level.actualTokens);
      const newTokens = level.actualTokens - reduceBy;

      if (newTokens <= 0) {
        // Remove this level entirely
        totalTokens -= level.actualTokens;
        levels.splice(i, 1);
      } else {
        level.content = truncateToTokens(level.content, newTokens);
        totalTokens -= reduceBy;
        level.actualTokens = newTokens;
      }
    }
  }

  // Format into a single string
  const formatted = levels
    .map((l) => `[${l.label}]\n${l.content}`)
    .join('\n\n');

  return {
    levels,
    formatted,
    totalTokens: levels.reduce((sum, l) => sum + l.actualTokens, 0),
  };
}

function buildPageContext(ctx: UIContext): string | null {
  const parts: string[] = [];

  if (ctx.page) parts.push(`Page: ${ctx.page}`);
  if (ctx.contact_name) {
    parts.push(`Contact: ${ctx.contact_name} (${ctx.contact_type ?? 'unknown'}, stage: ${ctx.contact_stage ?? 'unknown'})`);
  }
  if (ctx.listing_address) {
    parts.push(`Listing: ${ctx.listing_address}`);
  }
  if (ctx.segment) {
    parts.push(`Segment: ${ctx.segment}`);
  }
  if (ctx.campaign_type) {
    parts.push(`Campaign: ${ctx.campaign_type}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

function buildGlobalContext(
  voiceRules?: string[],
  tonePreference?: string
): string | null {
  const parts: string[] = [];

  if (tonePreference) {
    parts.push(`Tone: ${tonePreference}`);
  }
  if (voiceRules?.length) {
    parts.push('Voice rules:');
    voiceRules.forEach((r) => parts.push(`- ${r}`));
  }

  return parts.length > 0 ? parts.join('\n') : null;
}
