// ============================================================
// Comprehensive Tests for RAG Phase 1: Constants + Config Integrity
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMS,
  MODELS,
  MAX_TOKENS,
  RETRIEVAL,
  CHUNK_CONFIG,
  TOP_K_BY_INTENT,
  CONTENT_TYPES_BY_INTENT,
  GUARDRAIL_PATTERNS,
  DISCLAIMERS,
  SESSION,
  estimateTokens,
} from './constants';
import type { SourceTable, QueryIntent, ContentType } from './types';
import { SOURCE_TO_CONTENT_TYPE } from './types';

// ============================================================
// Model & embedding config
// ============================================================

describe('RAG Constants - Models', () => {
  it('uses Voyage-3-large for embeddings', () => {
    expect(EMBEDDING_MODEL).toBe('voyage-3-large');
  });

  it('embedding dimensions is 1024', () => {
    expect(EMBEDDING_DIMS).toBe(1024);
  });

  it('Tier 1 uses Haiku', () => {
    expect(MODELS.TIER1_PLANNER).toContain('haiku');
  });

  it('Tier 3 standard uses Sonnet', () => {
    expect(MODELS.TIER3_STANDARD).toContain('sonnet');
  });

  it('Tier 3 complex uses Opus', () => {
    expect(MODELS.TIER3_COMPLEX).toContain('opus');
  });

  it('max tokens escalate by tier', () => {
    expect(MAX_TOKENS.TIER1_PLANNER).toBeLessThan(MAX_TOKENS.TIER3_STANDARD);
    expect(MAX_TOKENS.TIER3_STANDARD).toBeLessThan(MAX_TOKENS.TIER3_COMPLEX);
  });
});

// ============================================================
// Chunk config coverage
// ============================================================

describe('RAG Constants - Chunk Config', () => {
  const allSourceTables: SourceTable[] = [
    'communications', 'activities', 'newsletters', 'contacts', 'listings',
    'agent_recommendations', 'message_templates', 'offers', 'offer_conditions',
    'knowledge_articles', 'competitive_emails',
  ];

  it('has chunk config for every source table', () => {
    for (const table of allSourceTables) {
      expect(CHUNK_CONFIG[table]).toBeDefined();
      expect(CHUNK_CONFIG[table].maxTokens).toBeGreaterThan(0);
      expect(CHUNK_CONFIG[table].overlap).toBeGreaterThanOrEqual(0);
    }
  });

  it('short-text sources have zero overlap', () => {
    const shortSources = ['communications', 'activities', 'agent_recommendations', 'message_templates', 'offers', 'offer_conditions'];
    for (const table of shortSources) {
      expect(CHUNK_CONFIG[table].overlap).toBe(0);
    }
  });

  it('long-text sources have overlap for continuity', () => {
    const longSources = ['newsletters', 'knowledge_articles', 'competitive_emails'];
    for (const table of longSources) {
      expect(CHUNK_CONFIG[table].overlap).toBeGreaterThan(0);
    }
  });

  it('max tokens are between 512 and 1024', () => {
    for (const table of allSourceTables) {
      expect(CHUNK_CONFIG[table].maxTokens).toBeGreaterThanOrEqual(512);
      expect(CHUNK_CONFIG[table].maxTokens).toBeLessThanOrEqual(1024);
    }
  });
});

// ============================================================
// Source table → content type mapping
// ============================================================

describe('RAG Types - SOURCE_TO_CONTENT_TYPE', () => {
  it('maps every source table to a content type', () => {
    const tables: SourceTable[] = [
      'communications', 'activities', 'newsletters', 'contacts', 'listings',
      'agent_recommendations', 'message_templates', 'offers', 'offer_conditions',
      'knowledge_articles', 'competitive_emails',
    ];
    for (const table of tables) {
      expect(SOURCE_TO_CONTENT_TYPE[table]).toBeDefined();
      expect(typeof SOURCE_TO_CONTENT_TYPE[table]).toBe('string');
    }
  });

  it('maps specific tables correctly', () => {
    expect(SOURCE_TO_CONTENT_TYPE.communications).toBe('message');
    expect(SOURCE_TO_CONTENT_TYPE.newsletters).toBe('email');
    expect(SOURCE_TO_CONTENT_TYPE.contacts).toBe('profile');
    expect(SOURCE_TO_CONTENT_TYPE.listings).toBe('listing');
    expect(SOURCE_TO_CONTENT_TYPE.competitive_emails).toBe('competitor');
    expect(SOURCE_TO_CONTENT_TYPE.knowledge_articles).toBe('faq');
  });
});

// ============================================================
// Intent → retrieval presets
// ============================================================

describe('RAG Constants - Intent Presets', () => {
  const allIntents: QueryIntent[] = [
    'follow_up', 'newsletter', 'social', 'qa', 'search',
    'summarize', 'competitive', 'greeting', 'clarification',
  ];

  it('has top_k for every intent', () => {
    for (const intent of allIntents) {
      expect(TOP_K_BY_INTENT[intent]).toBeDefined();
      expect(typeof TOP_K_BY_INTENT[intent]).toBe('number');
    }
  });

  it('greeting and clarification have top_k 0 (no retrieval)', () => {
    expect(TOP_K_BY_INTENT.greeting).toBe(0);
    expect(TOP_K_BY_INTENT.clarification).toBe(0);
  });

  it('summarize has highest top_k', () => {
    const maxK = Math.max(...Object.values(TOP_K_BY_INTENT));
    expect(TOP_K_BY_INTENT.summarize).toBe(maxK);
  });

  it('has content type filters for every intent', () => {
    for (const intent of allIntents) {
      expect(intent in CONTENT_TYPES_BY_INTENT).toBe(true);
    }
  });

  it('qa intent only searches knowledge base types', () => {
    const qaTypes = CONTENT_TYPES_BY_INTENT.qa!;
    expect(qaTypes).toContain('faq');
    expect(qaTypes).toContain('playbook');
    expect(qaTypes).toContain('script');
    expect(qaTypes).toContain('process');
    expect(qaTypes).not.toContain('message');
    expect(qaTypes).not.toContain('competitor');
  });

  it('follow_up searches messages and activities', () => {
    const types = CONTENT_TYPES_BY_INTENT.follow_up!;
    expect(types).toContain('message');
    expect(types).toContain('activity');
    expect(types).not.toContain('competitor');
  });

  it('search intent has null filter (searches everything)', () => {
    expect(CONTENT_TYPES_BY_INTENT.search).toBeNull();
  });
});

// ============================================================
// Guardrails
// ============================================================

describe('RAG Constants - Guardrails', () => {
  it('has at least 5 guardrail patterns', () => {
    expect(GUARDRAIL_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });

  it('detects tax advice questions', () => {
    const taxPatterns = GUARDRAIL_PATTERNS.filter((g) => g.type === 'tax');
    expect(taxPatterns.length).toBeGreaterThanOrEqual(1);
    const matches = taxPatterns.some((g) =>
      g.pattern.test('How should I structure my tax strategy?')
    );
    expect(matches).toBe(true);
  });

  it('detects legal advice questions', () => {
    const legalPatterns = GUARDRAIL_PATTERNS.filter((g) => g.type === 'legal');
    expect(legalPatterns.length).toBeGreaterThanOrEqual(1);
    const matches = legalPatterns.some((g) =>
      g.pattern.test('Can you give me legal advice on this contract?')
    );
    expect(matches).toBe(true);
  });

  it('detects financial guarantee language', () => {
    const financialPatterns = GUARDRAIL_PATTERNS.filter((g) => g.type === 'financial');
    expect(financialPatterns.length).toBeGreaterThanOrEqual(1);
    const matches = financialPatterns.some((g) =>
      g.pattern.test('This property has guaranteed appreciation')
    );
    expect(matches).toBe(true);
  });

  it('does not trigger on normal real estate questions', () => {
    const normalQuestions = [
      'What are the comparable sales in this area?',
      'Can you draft a follow-up email for this contact?',
      'How many showings did we have last week?',
      'What is subject removal?',
    ];
    for (const q of normalQuestions) {
      const triggered = GUARDRAIL_PATTERNS.some((g) => g.pattern.test(q));
      expect(triggered).toBe(false);
    }
  });

  it('has disclaimers for every guardrail type', () => {
    const types = new Set(GUARDRAIL_PATTERNS.map((g) => g.type));
    for (const type of types) {
      expect(DISCLAIMERS[type]).toBeDefined();
      expect(DISCLAIMERS[type].length).toBeGreaterThan(10);
    }
  });
});

// ============================================================
// Session config
// ============================================================

describe('RAG Constants - Session', () => {
  it('limits history to 6 turns', () => {
    expect(SESSION.MAX_HISTORY_TURNS).toBe(6);
  });

  it('idle timeout is 30 minutes', () => {
    expect(SESSION.IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  it('summarize threshold is 10 messages', () => {
    expect(SESSION.SUMMARIZE_THRESHOLD).toBe(10);
  });
});

// ============================================================
// Retrieval config
// ============================================================

describe('RAG Constants - Retrieval', () => {
  it('default top_k is 5', () => {
    expect(RETRIEVAL.DEFAULT_TOP_K).toBe(5);
  });

  it('similarity threshold is 0.3', () => {
    expect(RETRIEVAL.SIMILARITY_THRESHOLD).toBe(0.3);
  });

  it('max context tokens is 4000', () => {
    expect(RETRIEVAL.MAX_CONTEXT_TOKENS).toBe(4000);
  });

  it('max top_k is 20', () => {
    expect(RETRIEVAL.MAX_TOP_K).toBe(20);
  });
});
