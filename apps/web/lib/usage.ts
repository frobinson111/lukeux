import { prisma } from "./prisma";

const FREE_GENERATION_LIMIT = 2;

export type GenerationGateUser = {
  id: string;
  role: "USER" | "ADMIN" | "SUPERUSER";
  plan: "FREE" | "PRO";
  planStatus: string;
  generationLimit: number | null;
};

export async function assertCanGenerate(user: GenerationGateUser) {
  // Admins/superusers bypass limits/billing
  if (user.role === "ADMIN" || user.role === "SUPERUSER") return;

  // Pro + active bypasses limits
  if (user.plan === "PRO" && user.planStatus === "ACTIVE") return;

  if (user.planStatus === "SUSPENDED") {
    throw new Error("Account suspended");
  }

  const limit = user.generationLimit ?? FREE_GENERATION_LIMIT;

  const count = await prisma.usageLedger.count({
    where: { userId: user.id, type: "GENERATION" }
  });

  if (count >= limit) {
    throw new Error(`Generation limit reached (${limit}). Upgrade to Pro or contact an admin.`);
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
