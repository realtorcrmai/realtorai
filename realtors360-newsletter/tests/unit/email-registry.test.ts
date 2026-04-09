import { describe, it, expect } from 'vitest';
import { EMAIL_REGISTRY, getEmailComponent } from '../../src/emails/index.js';

describe('email registry', () => {
  it('registers all 5 M2 email types', () => {
    const expected = [
      'saved_search_match',
      'listing_price_drop',
      'listing_sold',
      'showing_confirmed',
      'contact_birthday',
    ];
    for (const type of expected) {
      expect(EMAIL_REGISTRY[type]).toBeDefined();
    }
  });

  it('returns null for unknown email types', () => {
    expect(getEmailComponent('does_not_exist')).toBeNull();
  });

  it('returns a component function for known types', () => {
    const Component = getEmailComponent('saved_search_match');
    expect(typeof Component).toBe('function');
  });
});
