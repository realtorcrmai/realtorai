/**
 * Tests for src/lib/flow-converter.ts
 *
 * Tests the bidirectional React Flow JSON <-> workflow_steps conversion.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { flowToSteps, stepsToFlow } from '@/lib/flow-converter';

// ═══════════════════════════════════════════════
// HELPERS — minimal valid data factories
// ═══════════════════════════════════════════════

function triggerNode(id = 'trigger-1') {
  return { id, type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Start' } };
}

function emailNode(id = 'email-1', extras: Record<string, unknown> = {}) {
  return {
    id,
    type: 'email',
    position: { x: 0, y: 140 },
    data: { label: 'Send Email', delay_value: 0, delay_unit: 'minutes', ...extras },
  };
}

function edge(source: string, target: string) {
  return { id: `e-${source}-${target}`, source, target };
}

// ═══════════════════════════════════════════════
// flowToSteps
// ═══════════════════════════════════════════════

describe('flowToSteps', () => {
  it('REQ-NEWSLETTER-006 TC-FC-001: returns empty array when no trigger node exists @p1', () => {
    const nodes = [{ id: 'x', type: 'email', position: { x: 0, y: 0 }, data: {} }];
    expect(flowToSteps(nodes, [])).toEqual([]);
  });

  it('REQ-NEWSLETTER-006 TC-FC-002: returns empty array when only trigger node with no successors @p1', () => {
    const steps = flowToSteps([triggerNode()], []);
    expect(steps).toEqual([]);
  });

  it('REQ-NEWSLETTER-006 TC-FC-003: converts a single email node to one step @p0', () => {
    const nodes = [triggerNode(), emailNode()];
    const edges = [edge('trigger-1', 'email-1')];
    const steps = flowToSteps(nodes, edges);
    expect(steps).toHaveLength(1);
    expect(steps[0].action_type).toBe('auto_email');
    expect(steps[0].step_order).toBe(1);
  });

  it('REQ-NEWSLETTER-006 TC-FC-004: converts multiple sequential nodes to ordered steps @p0', () => {
    const waitNode = { id: 'wait-1', type: 'wait', position: { x: 0, y: 280 }, data: { label: 'Wait', delay_value: 2, delay_unit: 'days' } };
    const nodes = [triggerNode(), emailNode(), waitNode];
    const edges = [edge('trigger-1', 'email-1'), edge('email-1', 'wait-1')];
    const steps = flowToSteps(nodes, edges);
    expect(steps).toHaveLength(2);
    expect(steps[0].step_order).toBe(1);
    expect(steps[1].step_order).toBe(2);
    expect(steps[1].action_type).toBe('wait');
  });

  it('REQ-NEWSLETTER-006 TC-FC-005: calculates delay_minutes correctly for hours @p0', () => {
    const node = emailNode('e1', { delay_value: 3, delay_unit: 'hours' });
    const steps = flowToSteps([triggerNode(), node], [edge('trigger-1', 'e1')]);
    expect(steps[0].delay_minutes).toBe(180);
  });

  it('REQ-NEWSLETTER-006 TC-FC-006: calculates delay_minutes correctly for days @p0', () => {
    const node = emailNode('e1', { delay_value: 2, delay_unit: 'days' });
    const steps = flowToSteps([triggerNode(), node], [edge('trigger-1', 'e1')]);
    expect(steps[0].delay_minutes).toBe(2880);
  });

  it('REQ-NEWSLETTER-006 TC-FC-007: defaults delay to 0 minutes when no delay data @p1', () => {
    const node = { id: 'n1', type: 'email', position: { x: 0, y: 0 }, data: { label: 'Send' } };
    const steps = flowToSteps([triggerNode(), node], [edge('trigger-1', 'n1')]);
    expect(steps[0].delay_minutes).toBe(0);
    expect(steps[0].delay_value).toBe(0);
  });

  it('REQ-NEWSLETTER-006 TC-FC-008: maps node types to correct action types @p0', () => {
    const types = [
      { nodeType: 'email', expected: 'auto_email' },
      { nodeType: 'aiEmail', expected: 'ai_email' },
      { nodeType: 'sms', expected: 'auto_sms' },
      { nodeType: 'whatsapp', expected: 'auto_whatsapp' },
      { nodeType: 'task', expected: 'manual_task' },
      { nodeType: 'condition', expected: 'condition' },
    ];

    for (const { nodeType, expected } of types) {
      const node = { id: `n-${nodeType}`, type: nodeType, position: { x: 0, y: 0 }, data: { label: nodeType } };
      const steps = flowToSteps([triggerNode(), node], [edge('trigger-1', node.id)]);
      expect(steps[0].action_type).toBe(expected);
    }
  });

  it('REQ-NEWSLETTER-006 TC-FC-009: preserves template_id from node data @p0', () => {
    const node = emailNode('e1', { template_id: 'tmpl-abc-123' });
    const steps = flowToSteps([triggerNode(), node], [edge('trigger-1', 'e1')]);
    expect(steps[0].template_id).toBe('tmpl-abc-123');
  });

  it('REQ-NEWSLETTER-006 TC-FC-010: sets template_id to null when not provided @p1', () => {
    const node = emailNode('e1');
    const steps = flowToSteps([triggerNode(), node], [edge('trigger-1', 'e1')]);
    expect(steps[0].template_id).toBeNull();
  });

  it('REQ-NEWSLETTER-006 TC-FC-011: preserves action_config fields @p0', () => {
    const node = emailNode('e1', { email_type: 'listing_alert', send_mode: 'auto' });
    const steps = flowToSteps([triggerNode(), node], [edge('trigger-1', 'e1')]);
    expect(steps[0].action_config).toMatchObject({
      email_type: 'listing_alert',
      send_mode: 'auto',
    });
  });
});

// ═══════════════════════════════════════════════
// stepsToFlow
// ═══════════════════════════════════════════════

describe('stepsToFlow', () => {
  it('REQ-NEWSLETTER-006 TC-FC-012: returns a trigger node even with empty steps @p1', () => {
    const { nodes, edges } = stepsToFlow([]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('trigger');
    expect(edges).toHaveLength(0);
  });

  it('REQ-NEWSLETTER-006 TC-FC-013: creates nodes and edges for each step @p0', () => {
    const steps = [
      { id: 'a', step_order: 1, name: 'Email', action_type: 'auto_email', delay_value: 0, delay_unit: 'minutes', template_id: null, action_config: {}, task_config: {}, condition_config: {} },
      { id: 'b', step_order: 2, name: 'Wait', action_type: 'wait', delay_value: 1, delay_unit: 'days', template_id: null, action_config: {}, task_config: {}, condition_config: {} },
    ];
    const { nodes, edges } = stepsToFlow(steps);
    // trigger + 2 step nodes
    expect(nodes).toHaveLength(3);
    // trigger->a, a->b
    expect(edges).toHaveLength(2);
  });

  it('REQ-NEWSLETTER-006 TC-FC-014: maps action_type back to correct node type @p0', () => {
    const steps = [
      { id: 'x', step_order: 1, name: 'AI Email', action_type: 'ai_email', delay_value: 0, delay_unit: 'minutes', template_id: null, action_config: {}, task_config: {}, condition_config: {} },
    ];
    const { nodes } = stepsToFlow(steps);
    const stepNode = nodes.find(n => n.id === 'step-x');
    expect(stepNode?.type).toBe('aiEmail');
  });

  it('REQ-NEWSLETTER-006 TC-FC-015: uses trigger config when provided @p0', () => {
    const { nodes } = stepsToFlow([], { trigger_type: 'journey_enroll', contact_type: 'buyer' });
    expect(nodes[0].data).toMatchObject({
      trigger_type: 'journey_enroll',
      contact_type: 'buyer',
    });
  });

  it('REQ-NEWSLETTER-006 TC-FC-016: sorts steps by step_order regardless of input order @p0', () => {
    const steps = [
      { id: 'b', step_order: 2, name: 'Second', action_type: 'auto_email', delay_value: 0, delay_unit: 'minutes', template_id: null, action_config: {}, task_config: {}, condition_config: {} },
      { id: 'a', step_order: 1, name: 'First', action_type: 'auto_sms', delay_value: 0, delay_unit: 'minutes', template_id: null, action_config: {}, task_config: {}, condition_config: {} },
    ];
    const { nodes, edges } = stepsToFlow(steps);
    // Edges should go trigger -> first -> second
    expect(edges[0].source).toBe('trigger-1');
    expect(edges[0].target).toBe('step-a');
    expect(edges[1].source).toBe('step-a');
    expect(edges[1].target).toBe('step-b');
  });
});

// ═══════════════════════════════════════════════
// Property-based tests (fast-check)
// ═══════════════════════════════════════════════

describe('flow-converter property tests', () => {
  const arbStep = fc.record({
    id: fc.uuid(),
    step_order: fc.nat({ max: 100 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    action_type: fc.constantFrom('auto_email', 'ai_email', 'auto_sms', 'wait', 'condition', 'manual_task'),
    delay_value: fc.nat({ max: 1440 }),
    delay_unit: fc.constantFrom('minutes', 'hours', 'days'),
    template_id: fc.option(fc.uuid(), { nil: null }),
    action_config: fc.constant({}),
    task_config: fc.constant({}),
    condition_config: fc.constant({}),
  });

  it('REQ-NEWSLETTER-006 TC-FC-017: stepsToFlow never throws on arbitrary valid steps @p2', () => {
    fc.assert(
      fc.property(fc.array(arbStep, { maxLength: 20 }), (steps) => {
        // Deduplicate step_order
        const deduped = steps.map((s, i) => ({ ...s, step_order: i + 1 }));
        const result = stepsToFlow(deduped);
        expect(result.nodes).toBeDefined();
        expect(result.edges).toBeDefined();
      }),
      { numRuns: 50 },
    );
  });

  it('REQ-NEWSLETTER-006 TC-FC-018: stepsToFlow always produces trigger node as first node @p2', () => {
    fc.assert(
      fc.property(fc.array(arbStep, { maxLength: 10 }), (steps) => {
        const deduped = steps.map((s, i) => ({ ...s, step_order: i + 1 }));
        const { nodes } = stepsToFlow(deduped);
        expect(nodes[0].type).toBe('trigger');
      }),
      { numRuns: 50 },
    );
  });

  it('REQ-NEWSLETTER-006 TC-FC-019: stepsToFlow node count equals steps + 1 (trigger) @p2', () => {
    fc.assert(
      fc.property(fc.array(arbStep, { maxLength: 10 }), (steps) => {
        const deduped = steps.map((s, i) => ({ ...s, step_order: i + 1 }));
        const { nodes } = stepsToFlow(deduped);
        expect(nodes).toHaveLength(deduped.length + 1);
      }),
      { numRuns: 50 },
    );
  });

  it('REQ-NEWSLETTER-006 TC-FC-020: stepsToFlow edge count equals number of steps @p2', () => {
    fc.assert(
      fc.property(fc.array(arbStep, { maxLength: 10 }), (steps) => {
        const deduped = steps.map((s, i) => ({ ...s, step_order: i + 1 }));
        const { edges } = stepsToFlow(deduped);
        expect(edges).toHaveLength(deduped.length);
      }),
      { numRuns: 50 },
    );
  });
});
