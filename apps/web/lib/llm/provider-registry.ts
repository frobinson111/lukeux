import type { LlmProvider } from "@luke-ux/shared";
import { OpenAiProvider } from "./providers/openai";

export function getProviders(): Record<string, LlmProvider> {
  const providers: Record<string, LlmProvider> = {};

  if (process.env.OPENAI_API_KEY) {
    providers.openai = new OpenAiProvider(process.env.OPENAI_API_KEY);
  }

  return providers;
}

export function getProvider(name: string): LlmProvider {
  const providers = getProviders();
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Provider ${name} not configured`);
  }
  return provider;
}
