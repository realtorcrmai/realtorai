import type Anthropic from '@anthropic-ai/sdk';
import { anthropic, CLAUDE_MODEL } from '../lib/anthropic.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { orchestratorTools, executeTool } from './tools.js';
import { NEWSLETTER_PERSONA_SYSTEM, buildVoiceProfileBlock } from './prompts.js';
import { EmailDraftSchema, validateDraft, type EmailDraft } from './validators.js';

/**
 * Newsletter orchestrator — Claude tool_use loop.
 *
 * A2: now loads the realtor's `realtor_agent_config` row and injects
 * voice profile / content preferences into the system prompt so every
 * realtor's emails sound like THEIR brand, not a generic template.
 *
 * A5: logs a structured summary after every run (turns, tokens, tools
 * called, duration, emit status) so cost and quality are visible.
 */

const MAX_TURNS = 8;
const TIMEOUT_MS = 30_000;

export type GenerateEmailResult =
  | { ok: true; draft: EmailDraft }
  | { ok: false; reason: string; partial?: EmailDraft };

export async function generateEmail(args: {
  userPrompt: string;
  realtorId?: string;
}): Promise<GenerateEmailResult> {
  const startedAt = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pino child types are complex
  const log = logger.child({ realtorId: args.realtorId }) as any as typeof logger;

  // A2: load realtor voice profile for personalized system prompt.
  let systemPrompt = NEWSLETTER_PERSONA_SYSTEM;
  if (args.realtorId) {
    const { data: agentConfig } = await supabase
      .from('realtor_agent_config')
      .select('tone, content_rankings, writing_style_rules, brand_name')
      .eq('realtor_id', args.realtorId)
      .maybeSingle();

    if (agentConfig) {
      const voiceBlock = buildVoiceProfileBlock(agentConfig);
      if (voiceBlock) {
        systemPrompt += '\n\n' + voiceBlock;
      }
    }
  }

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: args.userPrompt },
  ];

  let emittedDraft: EmailDraft | null = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const toolsCalled: string[] = [];
  let turns = 0;

  for (turns = 0; turns < MAX_TURNS; turns++) {
    if (Date.now() - startedAt > TIMEOUT_MS) {
      logSummary(log, turns, totalInputTokens, totalOutputTokens, toolsCalled, startedAt, 'timeout');
      return { ok: false, reason: `timeout after ${turns} turns` };
    }

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: orchestratorTools,
      messages,
    });

    // A5: accumulate token usage
    totalInputTokens += response.usage?.input_tokens ?? 0;
    totalOutputTokens += response.usage?.output_tokens ?? 0;

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    if (toolUses.length === 0) {
      log.warn({ stop_reason: response.stop_reason }, 'orchestrator: stopped without emit_email');
      logSummary(log, turns + 1, totalInputTokens, totalOutputTokens, toolsCalled, startedAt, 'no_emit');
      return { ok: false, reason: `stopped without emit_email (${response.stop_reason})` };
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      toolsCalled.push(toolUse.name);

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
    logSummary(log, turns, totalInputTokens, totalOutputTokens, toolsCalled, startedAt, 'max_turns');
    return { ok: false, reason: `max turns (${MAX_TURNS}) reached without emit_email` };
  }

  const validation = validateDraft(emittedDraft);
  if (!validation.ok) {
    logSummary(log, turns + 1, totalInputTokens, totalOutputTokens, toolsCalled, startedAt, 'validation_fail');
    return { ok: false, reason: validation.reason, partial: emittedDraft };
  }

  logSummary(log, turns + 1, totalInputTokens, totalOutputTokens, toolsCalled, startedAt, 'ok');
  return { ok: true, draft: emittedDraft };
}

// A5: structured summary log for cost tracking + quality dashboards.
function logSummary(
  log: typeof logger,
  turns: number,
  inputTokens: number,
  outputTokens: number,
  tools: string[],
  startedAt: number,
  outcome: string
): void {
  log.info(
    {
      turns,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      tools_called: tools,
      duration_ms: Date.now() - startedAt,
      outcome,
    },
    'orchestrator: run summary'
  );
}
