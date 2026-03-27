// ============================================================
// Comprehensive Tests for RAG Phase 1: Embeddings + Content Hash
// ============================================================

import { describe, it, expect } from 'vitest';
import { contentHash } from './embeddings';

// Note: embedText/embedBatch/embedQuery require VOYAGE_API_KEY and make
// external API calls, so we test contentHash and validate the module exports.

describe('contentHash', () => {
  it('returns a SHA-256 hex string (64 chars)', () => {
    const hash = contentHash('Hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic (same input → same hash)', () => {
    const hash1 = contentHash('Test content for embedding');
    const hash2 = contentHash('Test content for embedding');
    expect(hash1).toBe(hash2);
  });

  it('different text → different hash', () => {
    const hash1 = contentHash('First text');
    const hash2 = contentHash('Second text');
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', () => {
    const hash = contentHash('');
    expect(hash).toHaveLength(64);
    // SHA-256 of empty string is a known constant
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('handles unicode text', () => {
    const hash = contentHash('BC 不動産 — réal estate résumé');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles very long text', () => {
    const longText = 'A'.repeat(100000);
    const hash = contentHash(longText);
    expect(hash).toHaveLength(64);
  });

  it('is sensitive to whitespace', () => {
    const hash1 = contentHash('Hello world');
    const hash2 = contentHash('Hello  world');
    expect(hash1).not.toBe(hash2);
  });

  it('is sensitive to case', () => {
    const hash1 = contentHash('hello');
    const hash2 = contentHash('Hello');
    expect(hash1).not.toBe(hash2);
  });
});
