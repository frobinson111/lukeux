import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { callLlm } from "../../../../lib/llm/service";
import { assertCanGenerate, logGenerationUsage } from "../../../../lib/usage";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { model, prompt } = body || {};
  if (!model || !prompt) {
    return NextResponse.json({ error: "Missing model or prompt" }, { status: 400 });
  }

  // Define ids up front
  const taskId = crypto.randomUUID();
  const threadId = crypto.randomUUID();

  try {
    await assertCanGenerate({
      id: user.id,
      role: user.role as any,
      plan: user.plan as any,
      planStatus: user.planStatus as any,
      generationLimit: (user as any).generationLimit ?? null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Generation limit reached." }, { status: 402 });
  }

  const response = await callLlm({ prompt, model, mode: "auto" });
  await logGenerationUsage(user.id, null, model);
  return NextResponse.json({
    content: response.content,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    taskId,
    threadId
  });
}
