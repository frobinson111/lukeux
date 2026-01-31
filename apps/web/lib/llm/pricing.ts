/**
 * LLM Model Pricing Configuration
 * Prices are in USD per 1 million tokens
 * Updated: January 2025
 */

export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  // OpenAI Models
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.00 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },

  // Anthropic Models
  "claude-sonnet-4-20250514": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-3-5-sonnet-latest": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-3-haiku-20240307": { inputPer1M: 0.25, outputPer1M: 1.25 },
};

/**
 * Calculate estimated cost in USD for a given model and token usage
 */
export function calculateCost(
  model: string | null | undefined,
  tokensIn: number | null | undefined,
  tokensOut: number | null | undefined
): number | null {
  if (!model || tokensIn == null || tokensOut == null) {
    return null;
  }

  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return null;
  }

  const inputCost = (tokensIn * pricing.inputPer1M) / 1_000_000;
  const outputCost = (tokensOut * pricing.outputPer1M) / 1_000_000;

  return inputCost + outputCost;
}

/**
 * Get the provider name from a model identifier
 */
export function getProviderFromModel(model: string | null | undefined): string {
  if (!model) return "unknown";
  if (model.startsWith("gpt-")) return "openai";
  if (model.startsWith("claude-")) return "anthropic";
  return "unknown";
}
