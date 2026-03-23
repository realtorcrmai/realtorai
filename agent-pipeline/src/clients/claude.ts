import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { withRetry } from "../utils/retry.js";
import { logger } from "../logger.js";

const client = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
});

export interface ClaudeOptions {
  model?: string;
  extendedThinking?: boolean;
  maxTokens?: number;
  thinkingBudget?: number;
}

export async function askClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: ClaudeOptions
): Promise<string> {
  const model = options?.model || config.CLAUDE_ANALYSIS_MODEL;
  const maxTokens = options?.maxTokens || 8192;
  const useThinking = options?.extendedThinking && config.USE_EXTENDED_THINKING;

  logger.debug(`Calling Claude (${model}, thinking=${useThinking})`);

  const response = await withRetry(
    async () => {
      const params: Anthropic.MessageCreateParams = {
        model,
        max_tokens: useThinking ? 16000 : maxTokens,
        messages: [{ role: "user", content: userPrompt }],
      };

      // Extended thinking requires system in a different way
      if (useThinking) {
        // @ts-ignore - extended thinking API
        params.thinking = {
          type: "enabled",
          budget_tokens: options?.thinkingBudget || config.EXTENDED_THINKING_BUDGET,
        };
        // System prompt goes into messages for extended thinking
        params.messages = [
          { role: "user", content: `${systemPrompt}\n\n---\n\n${userPrompt}` },
        ];
      } else {
        params.system = systemPrompt;
      }

      return client.messages.create(params);
    },
    { maxRetries: config.MAX_RETRIES, baseDelay: 1000, label: "Claude API" }
  );

  // Extract text from response blocks
  return extractTextContent(response);
}

function extractTextContent(message: Anthropic.Message): string {
  const textBlocks: string[] = [];

  for (const block of message.content) {
    if (block.type === "text") {
      textBlocks.push(block.text);
    }
    // Skip thinking blocks — they're internal reasoning
  }

  return textBlocks.join("\n");
}

/**
 * Ask Claude and parse the response as JSON.
 * If parsing fails, retry with a fix prompt.
 */
export async function askClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options?: ClaudeOptions
): Promise<T> {
  const response = await askClaude(systemPrompt, userPrompt, options);

  // Try to extract JSON from response (might be wrapped in ```json blocks)
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                    response.match(/```\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : response;

  try {
    return JSON.parse(jsonStr.trim()) as T;
  } catch (firstError) {
    logger.warn("Claude returned invalid JSON, requesting fix...");

    // Retry with fix prompt
    const fixResponse = await askClaude(
      "You previously returned invalid JSON. Fix it and return ONLY valid JSON wrapped in ```json blocks. No other text.",
      `Your previous response was:\n\n${response}\n\nThe JSON parse error was: ${firstError}\n\nReturn the corrected JSON only.`,
      { ...options, extendedThinking: false }
    );

    const fixMatch = fixResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
                     fixResponse.match(/```\s*([\s\S]*?)\s*```/);
    const fixStr = fixMatch ? fixMatch[1] : fixResponse;

    try {
      return JSON.parse(fixStr.trim()) as T;
    } catch (secondError) {
      throw new Error(`Claude returned invalid JSON after retry: ${secondError}`);
    }
  }
}
