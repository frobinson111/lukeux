import { getProvider } from "./provider-registry";
import type { LlmMode, LlmRequest, LlmResponse } from "@luke-ux/shared";

type CallLlmParams = {
  prompt: string;
  model: string;
  mode?: LlmMode;
  contextThreadId?: string;
  userId?: string;
  traceId?: string;
};

type ModelConfig = {
  provider: string;
  defaultMode: LlmMode;
};

export const MODEL_MAP: Record<string, ModelConfig> = {
  "gpt-4o-mini": { provider: "openai", defaultMode: "auto" },
  "gpt-4o": { provider: "openai", defaultMode: "auto" }
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
  const { prompt, model, mode, contextThreadId } = params;

  const config = MODEL_MAP[model];
  if (!config) {
    throw new Error(`Model ${model} is not supported`);
  }

  const provider = await getProvider(config.provider);
  const llmRequest: LlmRequest = {
    prompt,
    model,
    mode: mode ?? config.defaultMode,
    contextThreadId
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    // Provider implementations should honor AbortSignal internally if wired; this is a guardrail timeout.
    const response = await withRetry(() => provider.send(llmRequest), MAX_RETRIES);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

