import { describe, it, expect } from 'vitest';
import {
  buildSavedSearchUserPrompt,
  buildPriceDropUserPrompt,
  buildListingSoldUserPrompt,
  buildShowingConfirmedUserPrompt,
  buildBirthdayUserPrompt,
} from '../../src/orchestrator/prompts.js';

/**
 * These tests cover the prompt builders only — not the orchestrator itself,
 * which requires a real Anthropic API key and is exercised by the canary
 * scripts. The point of these tests is to catch breakage in the formatted
 * strings the orchestrator hands to Claude (token-cheap, fast feedback).
 */
describe('prompt builders', () => {
  it('saved search includes contact name + listing address + match count', () => {
    const out = buildSavedSearchUserPrompt({
      contactFirstName: 'Alex',
      realtorName: 'Sarah',
      matchedListingAddress: '123 Main St',
      matchCount: 3,
    });
    expect(out).toContain('Alex');
    expect(out).toContain('Sarah');
    expect(out).toContain('123 Main St');
    expect(out).toContain('3');
  });

  it('price drop formats numeric prices as CAD', () => {
    const out = buildPriceDropUserPrompt({
      sellerFirstName: 'Maria',
      realtorName: 'Sarah',
      listingAddress: '456 Oak Ave',
      oldPrice: 1_250_000,
      newPrice: 1_175_000,
    });
    expect(out).toContain('Maria');
    expect(out).toContain('456 Oak Ave');
    expect(out).toContain('$1,250,000');
    expect(out).toContain('$1,175,000');
  });

  it('price drop handles null prices gracefully', () => {
    const out = buildPriceDropUserPrompt({
      sellerFirstName: 'Maria',
      realtorName: 'Sarah',
      listingAddress: '456 Oak Ave',
      oldPrice: null,
      newPrice: null,
    });
    expect(out).toContain('the previous price');
    expect(out).toContain('the new price');
  });

  it('listing sold includes seller name + address', () => {
    const out = buildListingSoldUserPrompt({
      sellerFirstName: 'David',
      realtorName: 'Sarah',
      listingAddress: '789 Pine St',
    });
    expect(out).toContain('David');
    expect(out).toContain('789 Pine St');
    expect(out.toLowerCase()).toContain('sold');
  });

  it('showing confirmed formats the time in Vancouver', () => {
    const iso = '2026-05-15T18:00:00.000Z'; // 11:00 AM PDT
    const out = buildShowingConfirmedUserPrompt({
      sellerFirstName: 'Lin',
      realtorName: 'Sarah',
      listingAddress: '321 Elm Rd',
      showingTimeIso: iso,
    });
    expect(out).toContain('Lin');
    expect(out).toContain('321 Elm Rd');
    expect(out).toContain('Vancouver time');
    // Verify the time renders something reasonable (don't pin exact format
    // string in case Intl output changes between Node versions)
    expect(out).toMatch(/May/);
  });

  it('birthday is short and explicitly avoids real estate pitch', () => {
    const out = buildBirthdayUserPrompt({
      contactFirstName: 'Jordan',
      realtorName: 'Sarah',
    });
    expect(out).toContain('Jordan');
    expect(out.toLowerCase()).toContain('birthday');
    expect(out.toLowerCase()).toContain('no real estate pitch');
  });
});
