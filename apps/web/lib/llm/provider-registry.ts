import type { LlmProvider } from "@luke-ux/shared";
import { OpenAiProvider } from "./providers/openai";
import { prisma } from "../prisma";

const providerCache = new Map<string, LlmProvider>();

export async function getProvider(name: string): Promise<LlmProvider> {
  const cached = providerCache.get(name);
  if (cached) return cached;

  if (name === "openai") {
    const key = process.env.OPENAI_API_KEY || (await getDbKey("openai"));
    if (!key) {
      throw new Error("OpenAI key not configured");
    }
    const provider = new OpenAiProvider(key);
    providerCache.set(name, provider);
    return provider;
  }

  throw new Error(`Provider ${name} not configured`);
}

async function getDbKey(provider: string): Promise<string | null> {
  const key = await prisma.apiKey.findFirst({
    where: { provider, isActive: true },
    orderBy: { createdAt: "desc" }
  });
  return key?.key ?? null;
}
