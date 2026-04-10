import { describe, it, expect } from 'vitest';
import {
  buildVariableContext,
  resolveTemplateVariables,
} from '../../src/shared/workflow/template-vars.js';

/**
 * Tests for the M3-E template variable helpers.
 *
 * The CRM original (`lib/workflow-engine.ts`) has zero tests for these
 * functions. Locking them down here catches drift that would silently
 * break workflow step messages (e.g. a renamed variable or a missing
 * currency format).
 */

describe('resolveTemplateVariables', () => {
  it('replaces known placeholders', () => {
    const result = resolveTemplateVariables(
      'Hello {{contact_first_name}}, your agent is {{agent_name}}.',
      { contact_first_name: 'Alex', agent_name: 'Sarah' }
    );
    expect(result).toBe('Hello Alex, your agent is Sarah.');
  });

  it('leaves unknown placeholders as-is', () => {
    const result = resolveTemplateVariables(
      'Hello {{contact_first_name}}, value is {{unknown_var}}.',
      { contact_first_name: 'Alex' }
    );
    expect(result).toBe('Hello Alex, value is {{unknown_var}}.');
  });

  it('handles empty template', () => {
    expect(resolveTemplateVariables('', { foo: 'bar' })).toBe('');
  });

  it('handles template with no placeholders', () => {
    expect(resolveTemplateVariables('plain text', { foo: 'bar' })).toBe('plain text');
  });

  it('handles empty variables', () => {
    expect(resolveTemplateVariables('Hello {{name}}', {})).toBe('Hello {{name}}');
  });
});

describe('buildVariableContext', () => {
  it('extracts first name from full name', () => {
    const vars = buildVariableContext({ name: 'Alex Johnson', phone: '6045551234' });
    expect(vars.contact_first_name).toBe('Alex');
    expect(vars.contact_name).toBe('Alex Johnson');
  });

  it('handles single-word name', () => {
    const vars = buildVariableContext({ name: 'Madonna', phone: '6045551234' });
    expect(vars.contact_first_name).toBe('Madonna');
  });

  it('formats listing price as Canadian currency', () => {
    const vars = buildVariableContext(
      { name: 'Alex', phone: '555' },
      { address: '123 Main St', list_price: 1250000, closing_date: null }
    );
    expect(vars.listing_address).toBe('123 Main St');
    expect(vars.listing_price).toMatch(/\$1,250,000/);
  });

  it('handles missing listing', () => {
    const vars = buildVariableContext({ name: 'Alex', phone: '555' });
    expect(vars.listing_address).toBeUndefined();
    expect(vars.listing_price).toBeUndefined();
  });

  it('includes today_date', () => {
    const vars = buildVariableContext({ name: 'Alex', phone: '555' });
    expect(vars.today_date).toBeTruthy();
    expect(vars.today_date.length).toBeGreaterThan(5);
  });

  it('uses agent defaults when agent not provided', () => {
    const vars = buildVariableContext({ name: 'Alex', phone: '555' });
    expect(vars.agent_name).toBeTruthy();
  });

  it('uses provided agent info', () => {
    const vars = buildVariableContext(
      { name: 'Alex', phone: '555' },
      null,
      { name: 'Sarah', phone: '6041234567', email: 'sarah@example.com' }
    );
    expect(vars.agent_name).toBe('Sarah');
    expect(vars.agent_phone).toBe('6041234567');
    expect(vars.agent_email).toBe('sarah@example.com');
  });
});
