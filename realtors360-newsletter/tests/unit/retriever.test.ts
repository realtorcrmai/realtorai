import { describe, it, expect } from 'vitest';
import {
  formatContextChunks,
  extractSourceRefs,
  reciprocalRankFusion,
  formatVectorLiteral,
} from '../../src/shared/rag/retriever.js';
import { buildTsQuery } from '../../src/shared/rag/fallback.js';
import type { SearchResult } from '../../src/shared/rag/types.js';

/**
 * Tests for the deterministic helpers in the M4 retriever port.
 *
 * The CRM original (`realestate-crm/src/lib/rag/retriever.ts`) has zero
 * unit tests today — the M4 port follows the same pattern as M3-A/C/D and
 * locks down the parts that can be tested without invoking Voyage,
 * Anthropic, or Supabase:
 *
 *   - `buildTsQuery`     — punctuation stripping + token cap (10 terms)
 *   - `formatVectorLiteral` — Postgres vector literal serialization
 *   - `formatContextChunks` — token-budget truncation, ordering, citation
 *   - `extractSourceRefs` — snippet length cap, field mapping
 *   - `reciprocalRankFusion` — RRF math, dedup, single-source short-circuit
 *
 * Why these particular helpers:
 *
 *   - `formatContextChunks` is the contract with the LLM prompt. Any drift
 *     in the format silently changes lead-scorer output quality.
 *   - `reciprocalRankFusion` math is exactly the kind of thing that breaks
 *     subtly when someone "simplifies" the loop. Pin the values.
 *   - `buildTsQuery` decides whether the FTS fallback returns anything at
 *     all. A regression to e.g. `.replace(/\W/g, '')` would silently drop
 *     accented characters.
 */

function makeResult(
  source_table: string,
  source_id: string,
  content_text: string,
  similarity: number,
  source_created_at?: string
): SearchResult {
  return {
    source_table,
    source_id,
    content_text,
    similarity,
    source_created_at,
  };
}

/* ───────────────────────── buildTsQuery ───────────────────────── */

describe('buildTsQuery', () => {
  it('joins multi-word queries with " & "', () => {
    expect(buildTsQuery('open house this weekend')).toBe('open & house & this & weekend');
  });

  it('strips punctuation but preserves words', () => {
    expect(buildTsQuery('What about Vancouver, BC?!')).toBe('What & about & Vancouver & BC');
  });

  it('drops single-character tokens (noise filter)', () => {
    expect(buildTsQuery('a b cd ef g')).toBe('cd & ef');
  });

  it('caps at 10 terms to keep tsquery cheap', () => {
    const fifteen = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
    const result = buildTsQuery(fifteen);
    expect(result.split(' & ').length).toBe(10);
    expect(result.split(' & ')[0]).toBe('one');
    expect(result.split(' & ')[9]).toBe('ten');
  });

  it('returns empty string when nothing survives filtering', () => {
    expect(buildTsQuery('a b c')).toBe('');
    expect(buildTsQuery('!!! ??? ...')).toBe('');
    expect(buildTsQuery('')).toBe('');
  });
});

/* ───────────────────────── formatVectorLiteral ───────────────────────── */

describe('formatVectorLiteral', () => {
  it('serializes a vector as a Postgres array literal', () => {
    expect(formatVectorLiteral([1, 2, 3])).toBe('[1,2,3]');
  });

  it('preserves floating point precision', () => {
    expect(formatVectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  it('handles negative numbers', () => {
    expect(formatVectorLiteral([-0.5, 1, -2.25])).toBe('[-0.5,1,-2.25]');
  });

  it('handles an empty vector (defensive — should never happen in practice)', () => {
    expect(formatVectorLiteral([])).toBe('[]');
  });
});

/* ───────────────────────── formatContextChunks ───────────────────────── */

describe('formatContextChunks', () => {
  it('returns empty string for empty input', () => {
    expect(formatContextChunks([])).toBe('');
  });

  it('numbers chunks starting from 1 with table+date+score citation', () => {
    const results = [
      makeResult('communications', 'c1', 'Hello world', 0.85, '2026-04-01T00:00:00Z'),
      makeResult('listings', 'l1', 'A nice condo', 0.72, '2026-03-15T00:00:00Z'),
    ];
    const formatted = formatContextChunks(results);
    expect(formatted).toContain('[1] (communications, 2026-04-01, score: 0.85) Hello world');
    expect(formatted).toContain('[2] (listings, 2026-03-15, score: 0.72) A nice condo');
  });

  it('separates chunks with "\\n---\\n"', () => {
    const results = [
      makeResult('a', '1', 'first', 0.9, '2026-01-01T00:00:00Z'),
      makeResult('b', '2', 'second', 0.8, '2026-01-02T00:00:00Z'),
    ];
    expect(formatContextChunks(results)).toMatch(/first[\s\S]*\n---\n[\s\S]*second/);
  });

  it('emits "unknown date" when source_created_at is missing', () => {
    const results = [makeResult('faqs', 'f1', 'No date here', 0.5)];
    expect(formatContextChunks(results)).toContain('unknown date');
  });

  it('truncates chunks past the MAX_CONTEXT_TOKENS budget', () => {
    // MAX_CONTEXT_TOKENS = 4000, char budget = 16000
    const bigText = 'x'.repeat(20_000);
    const results = [
      makeResult('a', '1', 'fits', 0.9, '2026-01-01T00:00:00Z'),
      makeResult('b', '2', bigText, 0.8, '2026-01-01T00:00:00Z'),
      makeResult('c', '3', 'never seen', 0.7, '2026-01-01T00:00:00Z'),
    ];
    const formatted = formatContextChunks(results);
    expect(formatted).toContain('fits');
    // The big chunk would push us over budget, so it (and everything after) is dropped.
    expect(formatted).not.toContain('xxxxx');
    expect(formatted).not.toContain('never seen');
  });
});

/* ───────────────────────── extractSourceRefs ───────────────────────── */

describe('extractSourceRefs', () => {
  it('maps each result to a SourceReference shape', () => {
    const results = [
      makeResult('communications', 'c1', 'short content', 0.9),
    ];
    expect(extractSourceRefs(results)).toEqual([
      {
        source_table: 'communications',
        source_id: 'c1',
        snippet: 'short content',
        similarity: 0.9,
      },
    ]);
  });

  it('caps snippet length at 200 characters', () => {
    const longText = 'a'.repeat(500);
    const refs = extractSourceRefs([makeResult('listings', 'l1', longText, 0.7)]);
    expect(refs[0].snippet.length).toBe(200);
    expect(refs[0].snippet).toBe('a'.repeat(200));
  });

  it('returns empty array for empty input', () => {
    expect(extractSourceRefs([])).toEqual([]);
  });
});

/* ───────────────────────── reciprocalRankFusion ───────────────────────── */

describe('reciprocalRankFusion', () => {
  it('returns empty for all-empty input', () => {
    expect(reciprocalRankFusion([[], [], []], 5)).toEqual([]);
  });

  it('preserves order when all rows are unique across lists', () => {
    const a = [makeResult('t', 'a', 'a', 0.9, '2026-01-01T00:00:00Z')];
    const b = [makeResult('t', 'b', 'b', 0.9, '2026-01-01T00:00:00Z')];
    const c = [makeResult('t', 'c', 'c', 0.9, '2026-01-01T00:00:00Z')];
    const fused = reciprocalRankFusion([a, b, c], 5);
    // All 3 entered each at rank 0, so RRF score is identical (1/61 each).
    // Sort is stable, so the iteration order through the Map is preserved.
    expect(fused.map((r) => r.source_id)).toEqual(['a', 'b', 'c']);
  });

  it('boosts a row that appears in multiple lists', () => {
    const shared = makeResult('t', 'shared', 'shared', 0.9, '2026-01-01T00:00:00Z');
    const onlyA = makeResult('t', 'onlyA', 'a', 0.9, '2026-01-01T00:00:00Z');
    const onlyB = makeResult('t', 'onlyB', 'b', 0.9, '2026-01-01T00:00:00Z');
    // shared appears in lists 1 AND 2 → score = 2 × 1/61 = 0.0328
    // onlyA appears once at rank 1 (worse than rank 0) → 1/62 = 0.0161
    // onlyB appears once at rank 0 → 1/61 = 0.0164
    const fused = reciprocalRankFusion([[onlyA, shared], [shared, onlyB], []], 3);
    expect(fused[0].source_id).toBe('shared');
  });

  it('dedups by composite key (source_table:source_id)', () => {
    const dup = makeResult('listings', 'L1', 'condo', 0.9, '2026-01-01T00:00:00Z');
    const fused = reciprocalRankFusion([[dup], [dup], [dup]], 5);
    expect(fused.length).toBe(1);
    expect(fused[0].source_id).toBe('L1');
  });

  it('does not collapse rows with same id but different source_table', () => {
    const a = makeResult('listings', 'X', 'listing X', 0.9, '2026-01-01T00:00:00Z');
    const b = makeResult('contacts', 'X', 'contact X', 0.9, '2026-01-01T00:00:00Z');
    const fused = reciprocalRankFusion([[a], [b]], 5);
    expect(fused.length).toBe(2);
  });

  it('truncates the fused list to topK', () => {
    const lists: SearchResult[][] = [[]];
    for (let i = 0; i < 30; i++) {
      lists[0].push(makeResult('t', `id${i}`, `c${i}`, 0.9, '2026-01-01T00:00:00Z'));
    }
    expect(reciprocalRankFusion(lists, 5).length).toBe(5);
  });
});
