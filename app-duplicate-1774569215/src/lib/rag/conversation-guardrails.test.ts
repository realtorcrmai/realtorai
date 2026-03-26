// ============================================================
// Comprehensive Tests for RAG Phase 4+5: Conversation + Guardrails + Feedback
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getRecentHistory,
  needsSummarization,
  buildUserMessage,
  buildAssistantMessage,
} from './conversation';
import {
  checkGuardrails,
  buildFallbackResponse,
  hasAdequateContext,
} from './guardrails';
import type { RagSession, RagMessage, SourceReference } from './types';

// ============================================================
// buildUserMessage
// ============================================================

describe('buildUserMessage', () => {
  it('creates user message with correct role', () => {
    const msg = buildUserMessage('Hello');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
    expect(msg.timestamp).toBeTruthy();
  });

  it('includes ISO timestamp', () => {
    const msg = buildUserMessage('Test');
    expect(msg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('has no sources', () => {
    const msg = buildUserMessage('Test');
    expect(msg.sources).toBeUndefined();
  });
});

// ============================================================
// buildAssistantMessage
// ============================================================

describe('buildAssistantMessage', () => {
  it('creates assistant message with correct role', () => {
    const msg = buildAssistantMessage('Response text');
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('Response text');
  });

  it('includes source references', () => {
    const sources: SourceReference[] = [
      { source_table: 'communications', source_id: 'c1', snippet: 'Hello', similarity: 0.9 },
    ];
    const msg = buildAssistantMessage('Answer', sources);
    expect(msg.sources).toHaveLength(1);
    expect(msg.sources![0].source_table).toBe('communications');
  });

  it('defaults to empty sources', () => {
    const msg = buildAssistantMessage('Answer');
    expect(msg.sources).toHaveLength(0);
  });
});

// ============================================================
// getRecentHistory
// ============================================================

describe('getRecentHistory', () => {
  const makeSession = (messageCount: number): RagSession => ({
    id: 'session-1',
    user_email: 'test@test.com',
    ui_context: {},
    tone_preference: 'professional',
    messages: Array.from({ length: messageCount }, (_, i) => ({
      role: i % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `Message ${i}`,
      timestamp: '2026-03-20T10:00:00Z',
    })),
    is_active: true,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  });

  it('returns all messages when under limit', () => {
    const session = makeSession(4);
    const history = getRecentHistory(session);
    expect(history).toHaveLength(4);
  });

  it('returns only last MAX_HISTORY_TURNS messages', () => {
    const session = makeSession(20);
    const history = getRecentHistory(session);
    expect(history).toHaveLength(6); // SESSION.MAX_HISTORY_TURNS = 6
    expect(history[0].content).toBe('Message 14');
    expect(history[5].content).toBe('Message 19');
  });

  it('returns empty array for empty session', () => {
    const session = makeSession(0);
    expect(getRecentHistory(session)).toHaveLength(0);
  });
});

// ============================================================
// needsSummarization
// ============================================================

describe('needsSummarization', () => {
  const makeSession = (n: number): RagSession => ({
    id: 'x', user_email: 'x', ui_context: {}, tone_preference: 'professional',
    messages: Array.from({ length: n }, () => ({ role: 'user' as const, content: 'x', timestamp: '' })),
    is_active: true, created_at: '', updated_at: '',
  });

  it('returns false for short sessions', () => {
    expect(needsSummarization(makeSession(5))).toBe(false);
    expect(needsSummarization(makeSession(10))).toBe(false);
  });

  it('returns true when messages exceed threshold', () => {
    expect(needsSummarization(makeSession(11))).toBe(true);
    expect(needsSummarization(makeSession(50))).toBe(true);
  });
});

// ============================================================
// checkGuardrails
// ============================================================

describe('checkGuardrails', () => {
  // Tax advice
  it('blocks tax strategy questions', () => {
    const result = checkGuardrails('How should I structure my tax strategy for selling?');
    expect(result.blocked).toBe(true);
    expect(result.type).toBe('tax');
    expect(result.disclaimer).toContain('tax');
  });

  it('blocks tax advice questions', () => {
    const result = checkGuardrails('What tax deductions can my client claim?');
    expect(result.blocked).toBe(true);
    expect(result.type).toBe('tax');
  });

  // Legal advice
  it('blocks legal advice questions', () => {
    const result = checkGuardrails('Can you give me legal advice on this contract dispute?');
    expect(result.blocked).toBe(true);
    expect(result.type).toBe('legal');
    expect(result.disclaimer).toContain('lawyer');
  });

  it('blocks legal liability questions', () => {
    const result = checkGuardrails('What is my legal liability if the deal falls through?');
    expect(result.blocked).toBe(true);
    expect(result.type).toBe('legal');
  });

  // Financial advice
  it('blocks guaranteed return language', () => {
    const result = checkGuardrails('This property has guaranteed appreciation of 10% per year');
    expect(result.blocked).toBe(true);
    expect(result.type).toBe('financial');
  });

  it('blocks mortgage qualification questions', () => {
    const result = checkGuardrails('Will my client qualify for a mortgage at this rate?');
    expect(result.blocked).toBe(true);
    expect(result.type).toBe('financial');
  });

  it('blocks investment advice', () => {
    const result = checkGuardrails('Should my client buy this as an investment property?');
    expect(result.blocked).toBe(true);
    expect(result.type).toBe('financial');
  });

  // Normal questions — should NOT trigger
  it('allows normal real estate questions', () => {
    const normalQuestions = [
      'What are the comparable sales in Kitsilano?',
      'Write a follow-up email for Sarah after the showing',
      'How many showings did we have last week?',
      'What is subject removal?',
      'Draft a newsletter intro for first-time buyers',
      'Create 3 Instagram captions for this listing',
      'What steps do we follow for listing onboarding?',
      'Summarize last 6 months of interactions with John',
      'How is the Surrey market performing?',
      'What are the closing costs for a $900k purchase?',
    ];
    for (const q of normalQuestions) {
      const result = checkGuardrails(q);
      expect(result.blocked).toBe(false);
      expect(result.type).toBeNull();
      expect(result.disclaimer).toBeNull();
    }
  });

  it('disclaimer is informative and recommends professional', () => {
    const tax = checkGuardrails('tax strategy advice');
    expect(tax.disclaimer).toContain('professional');

    const legal = checkGuardrails('legal advice on liability');
    expect(legal.disclaimer).toContain('lawyer');

    const financial = checkGuardrails('guaranteed sale profit');
    expect(financial.disclaimer).toContain('financial');
  });
});

// ============================================================
// buildFallbackResponse
// ============================================================

describe('buildFallbackResponse', () => {
  it('includes "limited data" message', () => {
    const response = buildFallbackResponse('follow_up');
    expect(response).toContain("don't have enough data");
  });

  it('includes improvement suggestions for follow_up', () => {
    const response = buildFallbackResponse('follow_up');
    expect(response).toContain('Add notes after calls');
    expect(response).toContain('Log showing feedback');
  });

  it('includes improvement suggestions for newsletter', () => {
    const response = buildFallbackResponse('newsletter');
    expect(response).toContain('Save prior newsletters');
    expect(response).toContain('content library');
  });

  it('includes improvement suggestions for social', () => {
    const response = buildFallbackResponse('social');
    expect(response).toContain('Instagram');
    expect(response).toContain('LinkedIn');
  });

  it('includes improvement suggestions for qa', () => {
    const response = buildFallbackResponse('qa');
    expect(response).toContain('Knowledge Base');
    expect(response).toContain('playbooks');
  });

  it('includes improvement suggestions for competitive', () => {
    const response = buildFallbackResponse('competitive');
    expect(response).toContain('competitor newsletters');
  });

  it('falls back to search tips for unknown intent', () => {
    const response = buildFallbackResponse('unknown_intent');
    expect(response).toContain("don't have enough data");
    expect(response).toContain('notes');
  });

  it('formats as bullet list', () => {
    const response = buildFallbackResponse('qa');
    expect(response).toContain('- ');
  });
});

// ============================================================
// hasAdequateContext
// ============================================================

describe('hasAdequateContext', () => {
  it('returns true when any score exceeds threshold', () => {
    expect(hasAdequateContext([0.5, 0.3, 0.2])).toBe(true);
    expect(hasAdequateContext([0.41])).toBe(true);
  });

  it('returns false when all scores below threshold', () => {
    expect(hasAdequateContext([0.3, 0.2, 0.1])).toBe(false);
    expect(hasAdequateContext([0.39])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasAdequateContext([])).toBe(false);
  });

  it('uses custom threshold', () => {
    expect(hasAdequateContext([0.5], 0.6)).toBe(false);
    expect(hasAdequateContext([0.5], 0.4)).toBe(true);
  });

  it('handles edge case at exact threshold', () => {
    expect(hasAdequateContext([0.4], 0.4)).toBe(true);
  });
});

// ============================================================
// End-to-end message flow simulation
// ============================================================

describe('E2E Message Flow', () => {
  it('builds a complete conversation turn', () => {
    // 1. User sends message
    const userMsg = buildUserMessage('Write a follow-up email for Sarah');
    expect(userMsg.role).toBe('user');

    // 2. Check guardrails
    const guard = checkGuardrails(userMsg.content);
    expect(guard.blocked).toBe(false);

    // 3. Simulate retrieval results
    const similarities = [0.87, 0.72, 0.65];
    expect(hasAdequateContext(similarities)).toBe(true);

    // 4. Build assistant response
    const sources: SourceReference[] = [
      { source_table: 'communications', source_id: 'c-1', snippet: 'Sarah loves Kits', similarity: 0.87 },
      { source_table: 'activities', source_id: 'a-1', snippet: 'Showing at 456 Oak', similarity: 0.72 },
    ];
    const assistantMsg = buildAssistantMessage(
      'Here is a follow-up email for Sarah based on her recent showing...',
      sources
    );
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.sources).toHaveLength(2);

    // 5. Verify session history building
    const session: RagSession = {
      id: 's-1', user_email: 'agent@test.com', ui_context: { contact_name: 'Sarah' },
      tone_preference: 'professional',
      messages: [userMsg, assistantMsg],
      is_active: true, created_at: '', updated_at: '',
    };
    expect(getRecentHistory(session)).toHaveLength(2);
    expect(needsSummarization(session)).toBe(false);
  });

  it('handles guardrail-blocked message', () => {
    const userMsg = buildUserMessage('Should my client invest in this property for guaranteed returns?');
    const guard = checkGuardrails(userMsg.content);
    expect(guard.blocked).toBe(true);
    expect(guard.type).toBe('financial');

    // Assistant should include disclaimer
    const assistantMsg = buildAssistantMessage(
      `${guard.disclaimer}\n\nBased on your CRM data, here's what I can share...`
    );
    expect(assistantMsg.content).toContain('financial advisor');
  });

  it('handles low-context fallback', () => {
    const similarities: number[] = [0.2, 0.15];
    expect(hasAdequateContext(similarities)).toBe(false);

    const fallback = buildFallbackResponse('follow_up');
    const assistantMsg = buildAssistantMessage(fallback);
    expect(assistantMsg.content).toContain("don't have enough data");
    expect(assistantMsg.content).toContain('Add notes');
  });
});
