import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { callLlm } from "../../../../lib/llm/service";
import { assertCanGenerate, logGenerationUsage } from "../../../../lib/usage";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { model, prompt, taskId, threadId } = body || {};

  if (!model || !prompt || !taskId || !threadId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

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

  const response = await callLlm({ prompt, model, mode: "auto", contextThreadId: threadId });
  await logGenerationUsage(user.id, null, model);
  return NextResponse.json({
    content: response.content,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    taskId,
    threadId
  });
}
