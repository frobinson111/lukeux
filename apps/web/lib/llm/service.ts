import { getProvider } from "./provider-registry";
import type { LlmMode, LlmRequest, LlmResponse, LlmImage, LlmPdfPage } from "@luke-ux/shared";

type CallLlmParams = {
  prompt: string;
  model: string;
  mode?: LlmMode;
  images?: LlmImage[];      // For direct images (PNG, JPEG, etc.)
  pdfPages?: LlmPdfPage[];  // For PDF pages rendered as images
  contextThreadId?: string;
  userId?: string;
  traceId?: string;
};

type ModelConfig = {
  provider: string;
  defaultMode: LlmMode;
  supportsVision: boolean;  // Whether the model can process images
};

export const MODEL_MAP: Record<string, ModelConfig> = {
  "gpt-5.2": { provider: "openai", defaultMode: "auto", supportsVision: true },
  "gpt-5.1": { provider: "openai", defaultMode: "auto", supportsVision: true },
  "gpt-4.0": { provider: "openai", defaultMode: "auto", supportsVision: true },
  "gpt-4o": { provider: "openai", defaultMode: "auto", supportsVision: true },
  "gpt-4o-mini": { provider: "openai", defaultMode: "auto", supportsVision: true },
  // Anthropic requires versioned model IDs
  "claude-3-opus-20240229": { provider: "anthropic", defaultMode: "auto", supportsVision: true },
  "claude-3-sonnet-20240229": { provider: "anthropic", defaultMode: "auto", supportsVision: true },
  "claude-3-haiku-20240307": { provider: "anthropic", defaultMode: "auto", supportsVision: true }
};

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 1;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((res) => setTimeout(res, 250 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export async function callLlm(params: CallLlmParams): Promise<LlmResponse> {
  const { prompt, model, mode, images, pdfPages, contextThreadId } = params;

  const config = MODEL_MAP[model];
  if (!config) {
    throw new Error(`Model ${model} is not supported`);
  }

  // Warn if visual content is provided but model doesn't support vision
  const hasVisualContent = (images && images.length > 0) || (pdfPages && pdfPages.length > 0);
  if (hasVisualContent && !config.supportsVision) {
    console.warn(`Model ${model} doesn't support vision. Visual content will be ignored.`);
  }

  const provider = await getProvider(config.provider);
  const llmRequest: LlmRequest = {
    prompt,
    model,
    mode: mode ?? config.defaultMode,
    // Only pass visual content if model supports it
    images: config.supportsVision ? images : undefined,
    pdfPages: config.supportsVision ? pdfPages : undefined,
    contextThreadId
  };

  // Increase timeout for vision requests (images take longer to process)
  const timeoutMs = hasVisualContent ? 60_000 : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Provider implementations should honor AbortSignal internally if wired; this is a guardrail timeout.
    const response = await withRetry(() => provider.send(llmRequest), MAX_RETRIES);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}
