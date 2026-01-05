import { prisma } from "./prisma";

const FREE_GENERATION_LIMIT = 2;

type GenerationCheck = {
  userId: string;
  plan: "FREE" | "PRO";
  planStatus: string;
  generationLimit?: number | null;
};

export async function assertCanGenerate(input: GenerationCheck) {
  const { userId, plan, planStatus } = input;
  if (plan === "PRO" && planStatus === "ACTIVE") return;
  if (planStatus === "SUSPENDED") {
    throw new Error("Account suspended");
  }

  const count = await prisma.usageLedger.count({
    where: { userId, type: "GENERATION" }
  });

  if (count >= FREE_GENERATION_LIMIT) {
    throw new Error("Free tier limit reached. Upgrade to Pro for unlimited generations.");
  }
}

function isValidObjectId(id?: string | null) {
  return typeof id === "string" && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id);
}

export async function logUsage(
  userId: string,
  opts: { type: "GENERATION" | "FOLLOWUP" | "IMAGE"; taskId?: string | null; model?: string }
) {
  const safeTaskId = isValidObjectId(opts.taskId) ? opts.taskId : undefined;
  await prisma.usageLedger.create({
    data: {
      userId,
      taskId: safeTaskId,
      type: opts.type,
      model: opts.model
    }
  });
}
