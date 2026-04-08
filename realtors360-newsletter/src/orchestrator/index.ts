import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '../lib/anthropic.js';
import { logger } from '../lib/logger.js';
import { orchestratorTools, executeTool } from './tools.js';
import { NEWSLETTER_PERSONA_SYSTEM } from './prompts.js';
import { EmailDraftSchema, validateDraft, type EmailDraft } from './validators.js';

/**
 * Newsletter orchestrator — Claude tool_use loop.
 *
 * Caller hands in the user prompt for a specific email type. The loop runs
 * Claude with the orchestrator tools until Claude calls `emit_email`, then
 * validates the draft and returns it.
 *
 * Hard limits: 8 tool turns, 30s wall clock per call. If either is exceeded,
 * the orchestrator returns a draft with status='insufficient_data'.
 */

const MAX_TURNS = 8;
const TIMEOUT_MS = 30_000;

export type GenerateEmailResult =
  | { ok: true; draft: EmailDraft }
  | { ok: false; reason: string; partial?: EmailDraft };

export async function generateEmail(args: {
  userPrompt: string;
}): Promise<GenerateEmailResult> {
  const startedAt = Date.now();
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: args.userPrompt },
  ];

  let emittedDraft: EmailDraft | null = null;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (Date.now() - startedAt > TIMEOUT_MS) {
      return { ok: false, reason: `timeout after ${turn} turns` };
    }

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: NEWSLETTER_PERSONA_SYSTEM,
      tools: orchestratorTools,
      messages,
    });

    // Collect any tool_use blocks
    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    if (toolUses.length === 0) {
      // Claude stopped without calling emit_email
      logger.warn({ stop_reason: response.stop_reason }, 'orchestrator: stopped without emit_email');
      return { ok: false, reason: `stopped without emit_email (${response.stop_reason})` };
    }

    // Append assistant turn
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool call and prepare results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      logger.debug({ tool: toolUse.name }, 'orchestrator: tool call');

      if (toolUse.name === 'emit_email') {
        const parsed = EmailDraftSchema.safeParse(toolUse.input);
        if (parsed.success) {
          emittedDraft = parsed.data;
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ ok: true, captured: true }),
          });
        } else {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ ok: false, error: parsed.error.message }),
            is_error: true,
          });
        }
      } else {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });

    if (emittedDraft) break;
  }

  if (!emittedDraft) {
    return { ok: false, reason: `max turns (${MAX_TURNS}) reached without emit_email` };
  }

  const validation = validateDraft(emittedDraft);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason, partial: emittedDraft };
  }

  return { ok: true, draft: emittedDraft };
}
