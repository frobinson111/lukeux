import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { requireUser } from "../../../lib/auth";
import { logUsage } from "../../../lib/usage";
import { prisma } from "../../../lib/prisma";
import crypto from "crypto";

const visualizeSchema = z.object({
  prompt: z.string().min(1),
  taskId: z.string().optional(),
  sectionId: z.string().optional(),
  sectionType: z.string().optional(),
  templateId: z.string().optional(), // e.g. heatmap_v1, matrix_v1, exec_card_v1
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).default("1024x1024"),
  n: z.number().int().min(1).max(4).default(1),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = visualizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { prompt, taskId, sectionId, sectionType, templateId, size, n } = parsed.data;

  // Check cache by input hash if taskId + sectionId provided
  const inputHash = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 32);

  if (taskId && sectionId) {
    const cached = await prisma.visualizationArtifact.findFirst({
      where: { taskId, sectionId, inputHash, status: "rendered" },
      orderBy: { createdAt: "desc" },
    });
    if (cached && cached.imageData) {
      return NextResponse.json({
        images: [`data:image/png;base64,${cached.imageData}`],
        artifactId: cached.id,
        cached: true,
      });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Visualization not configured" }, { status: 500 });
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      n,
    });

    const images =
      response.data
        ?.map((img: any) => {
          if (img?.b64_json) return `data:image/png;base64,${img.b64_json}`;
          if (img?.url) return img.url;
          return null;
        })
        ?.filter(Boolean) ?? [];

    // Store artifact if taskId provided
    let artifactId: string | null = null;
    if (taskId && images.length > 0) {
      const firstImage = images[0] as string;
      const base64Data = firstImage.startsWith("data:image/png;base64,")
        ? firstImage.slice("data:image/png;base64,".length)
        : null;

      const [w, h] = size.split("x").map(Number);

      const artifact = await prisma.visualizationArtifact.create({
        data: {
          taskId,
          sectionId: sectionId || null,
          sectionType: sectionType || null,
          templateId: templateId || null,
          format: "png",
          width: w,
          height: h,
          imageData: base64Data,
          inputHash,
          status: "rendered",
          createdByModel: "gpt-image-1",
        },
      });
      artifactId = artifact.id;
    }

    await logUsage(user.id, { type: "VISUALIZATION", taskId: taskId || null, model: "gpt-image-1" });
    return NextResponse.json({ images, artifactId });
  } catch (err: any) {
    const message = err?.message || "Visualization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: List visualization artifacts for a task
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const artifacts = await prisma.visualizationArtifact.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      taskId: true,
      sectionId: true,
      sectionType: true,
      templateId: true,
      format: true,
      width: true,
      height: true,
      status: true,
      createdAt: true,
      createdByModel: true,
    },
  });

  return NextResponse.json({ artifacts });
}
