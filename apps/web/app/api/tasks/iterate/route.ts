import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { callLlm } from "../../../../lib/llm/service";
import { assertCanGenerate, logGenerationUsage } from "../../../../lib/usage";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { model, prompt, taskId, threadId, mode, detailLevel, assets } = body || {};

  if (!model || !prompt || !taskId || !threadId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const allowedModes = ["auto", "instant", "thinking"];
  const allowedDetail = ["brief", "standard", "in-depth"];
  const selectedMode = allowedModes.includes(mode) ? mode : "auto";
  const selectedDetail = allowedDetail.includes(detailLevel) ? detailLevel : "standard";

  const detailSuffix =
    selectedDetail === "brief"
      ? "Keep the response concise: 3-5 bullets or short paragraphs."
      : selectedDetail === "in-depth"
      ? "Provide an in-depth response with clear sections and 8-12 detailed points."
      : "Provide a balanced response with 5-8 clear points.";

  const assetsArray: { name?: string; type?: string; content?: string }[] = Array.isArray(assets) ? assets : [];
  const assetsSectionRaw = assetsArray
    .map((a) => {
      const name = a.name || "asset";
      const type = a.type || "unknown";
      const content = a.content || "";
      if (type === "image") {
        return `- ${name} (image):\n![${name}](${content})`;
      }
      const capped = content.length > 2000 ? `${content.slice(0, 2000)}\n...[truncated]` : content;
      return `- ${name} (${type}):\n${capped}`;
    })
    .join("\n\n");

  const MAX_ASSETS_SECTION = 50_000;
  const assetsSection =
    assetsSectionRaw.length > MAX_ASSETS_SECTION
      ? `${assetsSectionRaw.slice(0, MAX_ASSETS_SECTION)}\n...[assets truncated to stay within token limits]`
      : assetsSectionRaw;

  const fullPrompt =
    assetsSection && assetsSection.length > 0
      ? `${prompt}\n\nAssets provided:\n${assetsSection}\n\n${detailSuffix}`
      : `${prompt}\n\n${detailSuffix}`;

  try {
    await assertCanGenerate({
      userId: user.id,
      plan: user.plan as any,
      planStatus: user.planStatus as any,
      generationLimit: (user as any).generationLimit ?? null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Generation limit reached." }, { status: 402 });
  }

  const response = await callLlm({ prompt: fullPrompt, model, mode: selectedMode as any, contextThreadId: threadId });
  await logGenerationUsage(user.id, null, model);
  return NextResponse.json({
    content: response.content,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    taskId,
    threadId
  });
}
