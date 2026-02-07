import { prisma } from "../prisma";
import { MODEL_MAP } from "./service";

// Map providers to supported model ids. Extend as new providers/ids are added.
const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-5.2", "gpt-5.1", "gpt-4.0", "gpt-4o", "gpt-4o-mini"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-latest", "claude-3-haiku-20240307"],
  local: ["local-fast"]
};

function applyEnvAllowlist(models: string[]): string[] {
  const allow = process.env.OPENAI_MODELS_ALLOWLIST;
  if (!allow) return models;
  const allowed = allow
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.length) return models;
  const set = new Set(allowed);
  return models.filter((m) => set.has(m));
}

/** @deprecated Use getEnabledModels() instead – reads from LlmModel table */
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
    const filtered = applyEnvAllowlist(unique);
    return filtered.length > 0 ? filtered : Object.keys(MODEL_MAP);
  } catch {
    return applyEnvAllowlist(Object.keys(MODEL_MAP));
  }
}

/** Get all LLM models from the centralized LlmModel table */
export async function getAllLlmModels() {
  return prisma.llmModel.findMany({
    orderBy: { sortOrder: "asc" }
  });
}

/** Get only enabled LLM models (for user-facing dropdowns) */
export async function getEnabledModels() {
  return prisma.llmModel.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" }
  });
}


