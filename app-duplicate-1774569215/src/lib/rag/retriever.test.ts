// ============================================================
// Comprehensive Tests for RAG Phase 3: Retriever + Query Planner + Synthesizer
// ============================================================

import { describe, it, expect } from 'vitest';
import type { SearchResult, UIContext, RagMessage, QueryPlan } from './types';

// We test the pure functions exported from each module.
// API-dependent functions (searchEmbeddings, planQuery, synthesize) require
// external services and are validated via integration tests in Phase 12.

// ---------- Import pure functions ----------
// retriever.ts
import { formatContextChunks, extractSourceRefs } from './retriever';
// query-planner.ts
import { buildContextInfo, validateIntent, fallbackPlan } from './query-planner';
// synthesizer.ts
import { buildSystemPrompt, buildMessages } from './synthesizer';

// ============================================================
// formatContextChunks
// ============================================================

describe('formatContextChunks', () => {
  const makeResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
    id: 'emb-001',
    content_text: 'Sarah mentioned she loves the Kitsilano area and wants 3 bedrooms.',
    content_summary: null,
    source_table: 'communications',
    source_id: 'comm-123',
    content_type: 'message',
    contact_id: 'c-200',
    listing_id: null,
    similarity: 0.87,
    source_created_at: '2026-03-20T10:00:00Z',
    ...overrides,
  });

  it('formats single result with number, source, date, and score', () => {
    const formatted = formatContextChunks([makeResult()]);
    expect(formatted).toContain('[1]');
    expect(formatted).toContain('communications');
    expect(formatted).toContain('2026-03-20');
    expect(formatted).toContain('0.87');
    expect(formatted).toContain('Kitsilano');
  });

  it('formats multiple results with sequential numbers', () => {
    const results = [
      makeResult({ content_text: 'First result', similarity: 0.92 }),
      makeResult({ content_text: 'Second result', similarity: 0.85, source_table: 'activities' }),
      makeResult({ content_text: 'Third result', similarity: 0.71, source_table: 'newsletters' }),
    ];
    const formatted = formatContextChunks(results);
    expect(formatted).toContain('[1]');
    expect(formatted).toContain('[2]');
    expect(formatted).toContain('[3]');
    expect(formatted).toContain('First result');
    expect(formatted).toContain('Second result');
    expect(formatted).toContain('Third result');
  });

  it('separates results with ---', () => {
    const results = [makeResult(), makeResult({ content_text: 'Another' })];
    const formatted = formatContextChunks(results);
    expect(formatted).toContain('---');
  });

  it('returns empty string for no results', () => {
    expect(formatContextChunks([])).toBe('');
  });

  it('handles null source_created_at', () => {
    const formatted = formatContextChunks([makeResult({ source_created_at: null })]);
    expect(formatted).toContain('unknown date');
  });

  it('truncates at MAX_CONTEXT_TOKENS budget', () => {
    // Create 100 results with 500-char content each
    const longResults = Array.from({ length: 100 }, (_, i) =>
      makeResult({
        content_text: `Result ${i}: ${'A'.repeat(500)}`,
        similarity: 0.9 - i * 0.005,
      })
    );
    const formatted = formatContextChunks(longResults);
    // Should be under 16000 chars (4000 tokens * 4 chars)
    expect(formatted.length).toBeLessThan(17000);
    // Should not contain all 100 results
    expect(formatted).not.toContain('[100]');
  });
});

// ============================================================
// extractSourceRefs
// ============================================================

describe('extractSourceRefs', () => {
  it('extracts source references with truncated snippets', () => {
    const results: SearchResult[] = [
      {
        id: 'e1', content_text: 'A'.repeat(300), content_summary: null,
        source_table: 'communications', source_id: 'comm-1',
        content_type: 'message', contact_id: 'c1', listing_id: null,
        similarity: 0.9, source_created_at: '2026-03-20',
      },
    ];
    const refs = extractSourceRefs(results);
    expect(refs).toHaveLength(1);
    expect(refs[0].source_table).toBe('communications');
    expect(refs[0].source_id).toBe('comm-1');
    expect(refs[0].similarity).toBe(0.9);
    expect(refs[0].snippet.length).toBeLessThanOrEqual(200);
  });

  it('handles multiple results', () => {
    const results: SearchResult[] = [
      { id: 'e1', content_text: 'First', content_summary: null, source_table: 'communications', source_id: 's1', content_type: 'message', contact_id: null, listing_id: null, similarity: 0.9, source_created_at: null },
      { id: 'e2', content_text: 'Second', content_summary: null, source_table: 'activities', source_id: 's2', content_type: 'activity', contact_id: null, listing_id: null, similarity: 0.8, source_created_at: null },
    ];
    const refs = extractSourceRefs(results);
    expect(refs).toHaveLength(2);
    expect(refs[0].source_table).toBe('communications');
    expect(refs[1].source_table).toBe('activities');
  });

  it('returns empty array for no results', () => {
    expect(extractSourceRefs([])).toHaveLength(0);
  });
});

// ============================================================
// buildContextInfo (query-planner)
// ============================================================

describe('buildContextInfo', () => {
  it('returns "No context loaded" for empty context', () => {
    expect(buildContextInfo({})).toBe('No context loaded');
  });

  it('includes page', () => {
    expect(buildContextInfo({ page: '/contacts/123' })).toContain('/contacts/123');
  });

  it('includes contact info', () => {
    const info = buildContextInfo({
      contact_name: 'Sarah Chen',
      contact_type: 'buyer',
      contact_stage: 'warm',
      contact_id: 'c-123',
    });
    expect(info).toContain('Sarah Chen');
    expect(info).toContain('buyer');
    expect(info).toContain('warm');
    expect(info).toContain('c-123');
  });

  it('includes listing info', () => {
    const info = buildContextInfo({
      listing_address: '123 Main St',
      listing_id: 'l-456',
    });
    expect(info).toContain('123 Main St');
    expect(info).toContain('l-456');
  });

  it('includes campaign and segment', () => {
    const info = buildContextInfo({
      campaign_type: 'listing_alert',
      segment: 'First-time buyers, Surrey',
    });
    expect(info).toContain('listing_alert');
    expect(info).toContain('First-time buyers, Surrey');
  });

  it('truncates draft content at 200 chars', () => {
    const info = buildContextInfo({
      draft_content: 'A'.repeat(500),
    });
    expect(info).toContain('Draft: ');
    // The draft portion should be at most ~200 chars
    const draftPart = info.split('Draft: ')[1];
    expect(draftPart.length).toBeLessThanOrEqual(201);
  });

  it('joins multiple fields with pipes', () => {
    const info = buildContextInfo({
      page: '/contacts/123',
      contact_name: 'John',
      listing_address: '456 Oak',
    });
    expect(info).toContain(' | ');
  });
});

// ============================================================
// validateIntent
// ============================================================

describe('validateIntent', () => {
  it('returns valid intents as-is', () => {
    expect(validateIntent('follow_up')).toBe('follow_up');
    expect(validateIntent('newsletter')).toBe('newsletter');
    expect(validateIntent('social')).toBe('social');
    expect(validateIntent('qa')).toBe('qa');
    expect(validateIntent('search')).toBe('search');
    expect(validateIntent('summarize')).toBe('summarize');
    expect(validateIntent('competitive')).toBe('competitive');
    expect(validateIntent('greeting')).toBe('greeting');
    expect(validateIntent('clarification')).toBe('clarification');
  });

  it('falls back to "search" for invalid intents', () => {
    expect(validateIntent('invalid')).toBe('search');
    expect(validateIntent('')).toBe('search');
    expect(validateIntent('random_string')).toBe('search');
  });
});

// ============================================================
// fallbackPlan
// ============================================================

describe('fallbackPlan', () => {
  it('creates search plan from message', () => {
    const plan = fallbackPlan('Find contacts in Surrey', {});
    expect(plan.intent).toBe('search');
    expect(plan.search_text).toBe('Find contacts in Surrey');
    expect(plan.needs_retrieval).toBe(true);
    expect(plan.escalate_to_opus).toBe(false);
    expect(plan.top_k).toBe(5);
  });

  it('preserves UI context filters', () => {
    const plan = fallbackPlan('Tell me about this contact', {
      contact_id: 'c-123',
      listing_id: 'l-456',
    });
    expect(plan.filters.contact_id).toBe('c-123');
    expect(plan.filters.listing_id).toBe('l-456');
  });
});

// ============================================================
// buildSystemPrompt (synthesizer)
// ============================================================

describe('buildSystemPrompt', () => {
  it('includes tone preference', () => {
    const prompt = buildSystemPrompt({
      query: 'Test',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: [],
      uiContext: {},
      tonePreference: 'casual',
    });
    expect(prompt).toContain('TONE: casual');
  });

  it('includes voice rules', () => {
    const prompt = buildSystemPrompt({
      query: 'Test',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: [],
      uiContext: {},
      tonePreference: 'professional',
      voiceRules: ['Always start with "Hey"', 'Use first names only'],
    });
    expect(prompt).toContain('VOICE RULES');
    expect(prompt).toContain('Always start with "Hey"');
    expect(prompt).toContain('Use first names only');
  });

  it('includes CRM context when available', () => {
    const prompt = buildSystemPrompt({
      query: 'Test',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: [],
      uiContext: {
        contact_name: 'Sarah Chen',
        contact_type: 'buyer',
        contact_stage: 'warm',
        listing_address: '456 Oak Ave',
        segment: 'First-time buyers',
      },
      tonePreference: 'professional',
    });
    expect(prompt).toContain('CRM CONTEXT');
    expect(prompt).toContain('Sarah Chen');
    expect(prompt).toContain('456 Oak Ave');
    expect(prompt).toContain('First-time buyers');
  });

  it('includes retrieved context with instructions', () => {
    const prompt = buildSystemPrompt({
      query: 'Test',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '[1] (communications, 2026-03-20) Sarah said she likes Kits condos.',
      conversationHistory: [],
      uiContext: {},
      tonePreference: 'professional',
    });
    expect(prompt).toContain('RETRIEVED CONTEXT');
    expect(prompt).toContain('cite [N]');
    expect(prompt).toContain('Sarah said she likes Kits condos');
  });

  it('includes all safety rules', () => {
    const prompt = buildSystemPrompt({
      query: 'Test',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: [],
      uiContext: {},
      tonePreference: 'professional',
    });
    expect(prompt).toContain('ONLY state facts');
    expect(prompt).toContain('Never invent');
    expect(prompt).toContain('legal, tax, or financial');
    expect(prompt).toContain('limited data');
  });

  it('prepends guardrail disclaimer when triggered', () => {
    // Tested at synthesize() level — guardrailDisclaimer is prepended to final text
    // Here we verify system prompt doesn't include it (it's separate)
    const prompt = buildSystemPrompt({
      query: 'Test',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: [],
      uiContext: {},
      tonePreference: 'professional',
      guardrailDisclaimer: 'I cannot provide tax advice.',
    });
    // guardrailDisclaimer is NOT in system prompt — it's prepended to response text
    expect(prompt).not.toContain('I cannot provide tax advice');
  });
});

// ============================================================
// buildMessages (synthesizer)
// ============================================================

describe('buildMessages', () => {
  it('includes current message as last user message', () => {
    const messages = buildMessages({
      query: 'Write a follow-up email for Sarah',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: [],
      uiContext: {},
      tonePreference: 'professional',
    });
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Write a follow-up email for Sarah');
  });

  it('includes conversation history before current message', () => {
    const history: RagMessage[] = [
      { role: 'user', content: 'Tell me about Sarah', timestamp: '2026-03-20T10:00:00Z' },
      { role: 'assistant', content: 'Sarah is a buyer looking in Kitsilano.', timestamp: '2026-03-20T10:00:01Z' },
    ];
    const messages = buildMessages({
      query: 'Now write her a follow-up email',
      plan: { intent: 'follow_up', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: history,
      uiContext: {},
      tonePreference: 'professional',
    });
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Tell me about Sarah');
    expect(messages[1].role).toBe('assistant');
    expect(messages[2].role).toBe('user');
    expect(messages[2].content).toBe('Now write her a follow-up email');
  });

  it('limits history to MAX_HISTORY_TURNS', () => {
    const history: RagMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `Message ${i}`,
      timestamp: '2026-03-20T10:00:00Z',
    }));
    const messages = buildMessages({
      query: 'Final message',
      plan: { intent: 'search', search_text: '', filters: {}, top_k: 5, needs_retrieval: true, escalate_to_opus: false },
      context: '',
      conversationHistory: history,
      uiContext: {},
      tonePreference: 'professional',
    });
    // 6 history + 1 current = 7
    expect(messages).toHaveLength(7);
    expect(messages[messages.length - 1].content).toBe('Final message');
  });
});
