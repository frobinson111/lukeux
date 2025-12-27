import { prisma } from "../prisma";
import { MODEL_MAP } from "./service";

// Map providers to supported model ids. Extend as new providers/ids are added.
const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini"],
  anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
  local: ["local-fast"]
};

export async function getAvailableModelsFromKeys(): Promise<string[]> {
  // If DB call fails for any reason, fall back to MODEL_MAP keys.
  try {
    const keys = await prisma.apiKey.findMany({
      where: { isActive: true },
      select: { provider: true }
    });
    const providers = Array.from(new Set(keys.map((k) => k.provider)));
    const models = providers.flatMap((p) => PROVIDER_MODELS[p] ?? []);
    const unique = Array.from(new Set(models));
    return unique.length > 0 ? unique : Object.keys(MODEL_MAP);
  } catch {
    return Object.keys(MODEL_MAP);
  }
}


