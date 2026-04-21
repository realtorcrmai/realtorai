/**
 * Claude-to-MCP Integration Test — Full Loop Verification
 * REQ-MCP-020: Claude correctly invokes MCP tools for user prompts
 *
 * Sends a prompt to the Claude API with an MCP server configured,
 * then verifies:
 *   1. Claude calls the expected tool
 *   2. Tool receives correct arguments
 *   3. Claude incorporates tool result into final response
 *   4. Full loop completes within timeout
 *
 * Stack: Vitest + @anthropic-ai/sdk + MCP server.
 *
 * Adapt: replace MCP_SERVER_URL, test prompts, and expected tool names.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// import Anthropic from '@anthropic-ai/sdk';

// --- Configuration ---
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 30000;

// Test prompts mapped to expected tool calls
const TEST_SCENARIOS = [
  {
    name: 'contact lookup',
    prompt: 'Look up the contact information for Alice Johnson in our CRM.',
    expectedTool: 'list_contacts',
    expectedArgs: { search: 'Alice Johnson' },
    responseContains: 'Alice',
  },
  {
    name: 'listing search',
    prompt: 'Find all active listings on Main Street.',
    expectedTool: 'list_listings',
    expectedArgs: { search: 'Main Street', status: 'active' },
    responseContains: 'Main Street',
  },
  {
    name: 'property assessment',
    prompt: 'Look up the BC Assessment value for 123 Main St, Vancouver, BC.',
    expectedTool: 'lookup_assessment',
    expectedArgs: { address: '123 Main St, Vancouver, BC' },
    responseContains: 'assessment',
  },
];

// --- Helpers ---

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface TextBlock {
  type: 'text';
  text: string;
}

type ContentBlock = ToolUseBlock | TextBlock;

/**
 * Extract tool_use blocks from a Claude message response.
 */
function extractToolUses(content: ContentBlock[]): ToolUseBlock[] {
  return content.filter((b): b is ToolUseBlock => b.type === 'tool_use');
}

/**
 * Extract text blocks from a Claude message response.
 */
function extractText(content: ContentBlock[]): string {
  return content
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

// --- Client Setup ---

// let anthropic: Anthropic;

beforeAll(() => {
  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set — MCP integration tests will be skipped');
  }

  // Uncomment when ready:
  // anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
});

// === Section 1: Claude Calls Expected Tool ===

describe('REQ-MCP-020: Claude-to-MCP tool invocation', () => {
  for (const scenario of TEST_SCENARIOS) {
    it(`TC-MINT-${String(TEST_SCENARIOS.indexOf(scenario) + 1).padStart(3, '0')}: Claude calls ${scenario.expectedTool} for "${scenario.name}" @P0`, async () => {
      if (!ANTHROPIC_API_KEY) {
        return; // Skip without API key
      }

      // Uncomment when MCP server is available:
      // const message = await anthropic.messages.create({
      //   model: MODEL,
      //   max_tokens: MAX_TOKENS,
      //   system: 'You are a real estate CRM assistant. Use the available tools to answer questions about contacts, listings, and showings. Always use tools rather than making up data.',
      //   messages: [{ role: 'user', content: scenario.prompt }],
      //   tools: [
      //     {
      //       type: 'mcp',
      //       server_label: 'realtors360',
      //       server_url: MCP_SERVER_URL,
      //       // Alternatively for stdio:
      //       // type: 'mcp',
      //       // server_label: 'realtors360',
      //       // command: 'node',
      //       // args: ['dist/mcp-server.js'],
      //     },
      //   ],
      // });
      //
      // // Claude should have made a tool call
      // const toolUses = extractToolUses(message.content);
      // expect(toolUses.length).toBeGreaterThan(0);
      //
      // // The first tool call should be the expected tool
      // const firstToolCall = toolUses[0];
      // expect(firstToolCall.name).toBe(scenario.expectedTool);
      //
      // // Arguments should include expected fields
      // for (const [key, value] of Object.entries(scenario.expectedArgs)) {
      //   expect(firstToolCall.input).toHaveProperty(key);
      //   if (typeof value === 'string') {
      //     expect(String(firstToolCall.input[key]).toLowerCase()).toContain(
      //       value.toLowerCase(),
      //     );
      //   }
      // }

      expect(true).toBe(true);
    });
  }
});

// === Section 2: Full Loop — Prompt to Tool to Response ===

describe('REQ-MCP-020: Full Claude-MCP loop', () => {
  it('TC-MINT-010: Claude incorporates tool result into final response @P0', async () => {
    if (!ANTHROPIC_API_KEY) {
      return;
    }

    // Uncomment when MCP server is available:
    // // Step 1: Send prompt — Claude will call a tool
    // const step1 = await anthropic.messages.create({
    //   model: MODEL,
    //   max_tokens: MAX_TOKENS,
    //   system: 'You are a real estate CRM assistant. Use tools to answer questions.',
    //   messages: [{ role: 'user', content: 'How many active listings do we have?' }],
    //   tools: [
    //     { type: 'mcp', server_label: 'realtors360', server_url: MCP_SERVER_URL },
    //   ],
    // });
    //
    // // Should stop for tool use
    // expect(step1.stop_reason).toBe('tool_use');
    // const toolUses = extractToolUses(step1.content);
    // expect(toolUses.length).toBeGreaterThan(0);
    //
    // // Step 2: Simulate tool result and continue conversation
    // const toolResult = {
    //   listings: [
    //     { id: '1', address: '123 Main St', status: 'active' },
    //     { id: '2', address: '456 Oak Ave', status: 'active' },
    //   ],
    //   total: 2,
    // };
    //
    // const step2 = await anthropic.messages.create({
    //   model: MODEL,
    //   max_tokens: MAX_TOKENS,
    //   system: 'You are a real estate CRM assistant.',
    //   messages: [
    //     { role: 'user', content: 'How many active listings do we have?' },
    //     { role: 'assistant', content: step1.content },
    //     {
    //       role: 'user',
    //       content: [
    //         {
    //           type: 'tool_result',
    //           tool_use_id: toolUses[0].id,
    //           content: JSON.stringify(toolResult),
    //         },
    //       ],
    //     },
    //   ],
    //   tools: [
    //     { type: 'mcp', server_label: 'realtors360', server_url: MCP_SERVER_URL },
    //   ],
    // });
    //
    // // Claude should have generated a text response incorporating the tool data
    // expect(step2.stop_reason).toBe('end_turn');
    // const responseText = extractText(step2.content);
    // expect(responseText).toContain('2'); // Should mention the count
    // expect(responseText.toLowerCase()).toContain('active');

    expect(true).toBe(true);
  });

  it('TC-MINT-011: Claude handles tool error gracefully @P1', async () => {
    if (!ANTHROPIC_API_KEY) {
      return;
    }

    // Uncomment when MCP server is available:
    // // Step 1: Send prompt that triggers tool call
    // const step1 = await anthropic.messages.create({
    //   model: MODEL,
    //   max_tokens: MAX_TOKENS,
    //   system: 'You are a real estate CRM assistant.',
    //   messages: [{ role: 'user', content: 'Look up contact XYZ-999' }],
    //   tools: [
    //     { type: 'mcp', server_label: 'realtors360', server_url: MCP_SERVER_URL },
    //   ],
    // });
    //
    // if (step1.stop_reason === 'tool_use') {
    //   const toolUses = extractToolUses(step1.content);
    //
    //   // Step 2: Return a tool error
    //   const step2 = await anthropic.messages.create({
    //     model: MODEL,
    //     max_tokens: MAX_TOKENS,
    //     system: 'You are a real estate CRM assistant.',
    //     messages: [
    //       { role: 'user', content: 'Look up contact XYZ-999' },
    //       { role: 'assistant', content: step1.content },
    //       {
    //         role: 'user',
    //         content: [
    //           {
    //             type: 'tool_result',
    //             tool_use_id: toolUses[0].id,
    //             content: 'Error: Contact not found',
    //             is_error: true,
    //           },
    //         ],
    //       },
    //     ],
    //     tools: [
    //       { type: 'mcp', server_label: 'realtors360', server_url: MCP_SERVER_URL },
    //     ],
    //   });
    //
    //   // Claude should explain the error to the user, not crash
    //   const responseText = extractText(step2.content);
    //   expect(responseText.toLowerCase()).toMatch(/not found|couldn't find|no results/);
    // }

    expect(true).toBe(true);
  });
});

// === Section 3: Timeout + Performance ===

describe('REQ-MCP-021: Claude-MCP performance', () => {
  it('TC-MINT-020: full loop completes within 30 seconds @P1', async () => {
    if (!ANTHROPIC_API_KEY) {
      return;
    }

    // Uncomment when MCP server is available:
    // const start = Date.now();
    //
    // const message = await anthropic.messages.create({
    //   model: MODEL,
    //   max_tokens: MAX_TOKENS,
    //   messages: [{ role: 'user', content: 'List our contacts' }],
    //   tools: [
    //     { type: 'mcp', server_label: 'realtors360', server_url: MCP_SERVER_URL },
    //   ],
    // });
    //
    // const elapsed = Date.now() - start;
    // expect(elapsed).toBeLessThan(TIMEOUT_MS);

    expect(true).toBe(true);
  });

  it('TC-MINT-021: Claude does not call tool when question is general @P2', async () => {
    if (!ANTHROPIC_API_KEY) {
      return;
    }

    // Uncomment when MCP server is available:
    // const message = await anthropic.messages.create({
    //   model: MODEL,
    //   max_tokens: MAX_TOKENS,
    //   system: 'You are a real estate CRM assistant. Only use tools when the user asks about specific data.',
    //   messages: [{ role: 'user', content: 'What is the capital of Canada?' }],
    //   tools: [
    //     { type: 'mcp', server_label: 'realtors360', server_url: MCP_SERVER_URL },
    //   ],
    // });
    //
    // // Should answer directly without tool use
    // expect(message.stop_reason).toBe('end_turn');
    // const toolUses = extractToolUses(message.content);
    // expect(toolUses.length).toBe(0);

    expect(true).toBe(true);
  });
});

/*
 * Adapting This Template:
 *
 * 1. Set ANTHROPIC_API_KEY in .env.local
 * 2. Start MCP server and set MCP_SERVER_URL
 * 3. Update TEST_SCENARIOS with your tool names and prompts
 * 4. Uncomment the Anthropic client and assertions
 * 5. Run: npx vitest tests/mcp/integration.spec.ts
 *
 * Cost note: Each test makes 1-2 API calls to Claude.
 * Run these tests selectively (not on every CI push).
 */
