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

export async function logGenerationUsage(userId: string, taskId: string | null, model?: string) {
  await prisma.usageLedger.create({
    data: {
      userId,
      taskId: taskId || undefined,
      type: "GENERATION",
      model
    }
  });
}
