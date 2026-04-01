// ============================================================
// Unified Agent — Token Cost Tracking
// ============================================================
// Per-model cost calculation based on Anthropic's published
// pricing (as of 2025). Prices are per 1M tokens.
// ============================================================

// ---------------------------------------------------------------------------
// Model pricing (USD per 1 million tokens)
// ---------------------------------------------------------------------------

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Sonnet 4
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  // Haiku 3.5
  'claude-haiku-4-5-20251001': { input: 0.25, output: 1.25 },
  // Opus 4
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
};

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the USD cost for a given model invocation.
 *
 * @param model     - Model identifier (must match a key in MODEL_COSTS)
 * @param tokensIn  - Number of input tokens consumed
 * @param tokensOut - Number of output tokens generated
 * @returns USD cost as a floating-point number, or 0 if model is unknown
 */
export function calculateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing = MODEL_COSTS[model];
  if (!pricing) {
    console.warn(`[agent/cost] Unknown model "${model}" — returning $0.00`);
    return 0;
  }

  const inputCost = (tokensIn / 1_000_000) * pricing.input;
  const outputCost = (tokensOut / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a USD amount for display.
 * Shows 2 decimal places for amounts >= $0.01, or 4 decimal places for tiny amounts.
 *
 * @example formatCost(0.073)   // "$0.07"
 * @example formatCost(0.00042) // "$0.0004"
 * @example formatCost(1.5)     // "$1.50"
 */
export function formatCost(usd: number): string {
  if (usd >= 0.01) {
    return `$${usd.toFixed(2)}`;
  }
  if (usd > 0) {
    return `$${usd.toFixed(4)}`;
  }
  return '$0.00';
}

// ---------------------------------------------------------------------------
// Session cost accumulator
// ---------------------------------------------------------------------------

export interface SessionCostSummary {
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  calls: number;
}

/**
 * Create a session cost tracker that accumulates costs across
 * multiple model calls within a single agent session.
 */
export function createSessionCostTracker(): {
  add: (model: string, tokensIn: number, tokensOut: number) => number;
  summary: () => SessionCostSummary;
} {
  let totalCost = 0;
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let calls = 0;

  return {
    /** Add a model call and return its individual cost. */
    add(model: string, tokensIn: number, tokensOut: number): number {
      const cost = calculateCost(model, tokensIn, tokensOut);
      totalCost += cost;
      totalTokensIn += tokensIn;
      totalTokensOut += tokensOut;
      calls++;
      return cost;
    },

    /** Get the accumulated session cost summary. */
    summary(): SessionCostSummary {
      return { totalCost, totalTokensIn, totalTokensOut, calls };
    },
  };
}
