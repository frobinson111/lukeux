export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { requireUser } from "../../../../lib/auth";
import { logUsage } from "../../../../lib/usage";
import { captureUrlScreenshot } from "../../../../lib/url-screenshot";
import { callLlm } from "../../../../lib/llm/service";
import { prisma } from "../../../../lib/prisma";

const schema = z
  .object({
    // Provide either imageDataUrl OR url.
    imageDataUrl: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    // Default to landscape to better match the in-app wireframe output viewport (~789x549)
    // and reduce the likelihood of huge top/bottom whitespace.
    size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).default("1536x1024"),
    n: z.number().int().min(1).max(2).default(1),
    // Controls the rendering style of the output wireframe.
    style: z.enum(["lofi" /* future: "midfi" */]).default("lofi"),
    // When true, capture the full scrollable page instead of just the viewport.
    fullPage: z.boolean().default(false),
    // Viewport preset for URL screenshots.
    viewport: z.enum(["desktop", "tablet", "mobile"]).default("desktop")
  })
  .refine((v) => !!v.imageDataUrl || !!v.url, {
    message: "Provide imageDataUrl or url"
  });

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) throw new Error("Invalid image data URL");
  return { mimeType: m[1], base64Data: m[2] };
}

function normalizeMimeType(mimeType: string): "image/png" | "image/jpeg" | "image/webp" {
  const lower = mimeType.toLowerCase();
  if (lower === "image/png") return "image/png";
  if (lower === "image/webp") return "image/webp";
  // Browsers may report JPG as image/jpg; OpenAI vision accepts image/jpeg.
  if (lower === "image/jpg" || lower === "image/jpeg") return "image/jpeg";
  // Default to PNG (safe) if we can't detect.
  return "image/png";
}

const VIEWPORT_PRESETS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

function buildWireframeEditPrompt(style: "lofi", specText: string) {
  const styleRules =
    style === "lofi"
      ? [
          "Use a white background.",
          "Use only grayscale/black strokes.",
          "Use simple rectangles, lines, and placeholder text blocks.",
          "No colors, gradients, photos, shadows, or decorative UI styling.",
          "Preserve the exact layout, proportions, spacing, and hierarchy from the source image.",
          "Use generic labels (e.g., 'Button', 'Heading', 'Card') instead of brand names.",
          "If there are icons, represent them as simple outlined placeholders.",
          "Do not add new UI that isn't present in the source.",
          "Every element visible in the source image must appear in the wireframe at the same position and size."
        ].join(" ")
      : "";

  const framingRules =
    "Fill the canvas with the wireframe — match the source image dimensions exactly. " +
    "Do NOT add margins, padding, or whitespace that isn't in the source. " +
    "The wireframe must cover the full canvas, edge to edge, matching the source composition.";

  return `Convert this UI screenshot into a structurally faithful low-fidelity UX wireframe. ${styleRules} ${framingRules}\n\nStructural reference from analysis:\n${specText}`;
}

function base64ToFile(base64Data: string, mimeType: string, filename: string): File {
  const buffer = Buffer.from(base64Data, "base64");
  const blob = new Blob([buffer], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { imageDataUrl, url, size, n, style, fullPage, viewport } = parsed.data;

  const apiKey = process.env.OPENAI_API_KEY;
  // For wireframe generation we may use either an env key OR a DB key (same pattern as LLM providers)
  // because admins can configure API keys in the UI.
  const prismaKey = await prisma.apiKey.findFirst({
    where: { provider: "openai", isActive: true },
    orderBy: { createdAt: "desc" },
    select: { key: true }
  });
  const resolvedKey = apiKey || prismaKey?.key || null;
  if (!resolvedKey) {
    return NextResponse.json({ error: "Wireframe generation not configured" }, { status: 500 });
  }

  // 1) Acquire a source image (either upload or URL screenshot)
  let source: { mimeType: string; base64Data: string; sourceKind: "upload" | "url"; sourceUrl?: string };
  try {
    if (imageDataUrl) {
      const parsedImg = parseDataUrl(imageDataUrl);
      source = {
        ...parsedImg,
        sourceKind: "upload"
      };
    } else if (url) {
      // Validate URL quickly
      try {
        const u = new URL(url);
        if (!["http:", "https:"].includes(u.protocol)) throw new Error("Invalid URL protocol");
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
      const vp = VIEWPORT_PRESETS[viewport] || VIEWPORT_PRESETS.desktop;
      const shot = await captureUrlScreenshot(url, { fullPage, viewport: vp });
      source = {
        mimeType: shot.mimeType,
        base64Data: shot.base64Data,
        sourceKind: "url",
        sourceUrl: url
      };
    } else {
      return NextResponse.json({ error: "Provide imageDataUrl or url" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to acquire source image" }, { status: 500 });
  }

  // 2) Extract a wireframe-ready structural specification using a vision-capable LLM
  let specText = "";
  try {
    const specPrompt =
      "You are a high-fidelity to low-fidelity UX wireframe rendering engine. " +
      "Analyze the UI screenshot and output a structurally faithful wireframe specification. " +
      "Be extremely precise about positions, sizes, and proportions relative to the viewport. " +
      "Focus on layout and hierarchy only. Ignore colors, images, and branding. " +
      "Return plain text with sections:\n" +
      "- SCREEN: (device + approximate viewport)\n" +
      "- LAYOUT: (major regions with approximate percentage-based positions and sizes)\n" +
      "- COMPONENTS: (ordered top-to-bottom with precise relative sizes and positions)\n" +
      "- INTERACTIONS: (primary actions/CTAs inferred from controls)\n" +
      "Keep it concise but complete. Do NOT include advice or critique.";

    const llmResp = await callLlm({
      prompt: specPrompt,
      model: "gpt-4o",
      mode: "auto",
      images: [
        {
          name: source.sourceKind === "url" ? "url-screenshot.png" : "uploaded-ui",
          mimeType: normalizeMimeType(source.mimeType),
          base64Data: source.base64Data
        }
      ]
    });
    specText = llmResp.content || "";
  } catch (err: any) {
    const message = err?.message || "Failed to extract UI structure";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // 3) Render a lo-fi wireframe using images.edit with the source image as visual reference
  const client = new OpenAI({ apiKey: resolvedKey });
  try {
    const prompt = buildWireframeEditPrompt(style, specText);

    // Determine the file extension from the source mime type
    const ext = source.mimeType === "image/webp" ? "webp" : source.mimeType === "image/jpeg" ? "jpg" : "png";
    const sourceFile = base64ToFile(source.base64Data, source.mimeType, `source.${ext}`);

    const response = await client.images.edit({
      model: "gpt-image-1",
      image: sourceFile,
      prompt,
      size,
      n,
      quality: "high",
      input_fidelity: "high"
    });

    const images =
      response.data
        ?.map((img: any) => {
          if (img?.b64_json) return `data:image/png;base64,${img.b64_json}`;
          if (img?.url) return img.url;
          return null;
        })
        ?.filter(Boolean) ?? [];

    await logUsage(user.id, { type: "IMAGE", taskId: null, model: "gpt-image-1" });

    return NextResponse.json({
      images,
      spec: specText,
      source: {
        kind: source.sourceKind,
        url: source.sourceUrl || null
      }
    });
  } catch (err: any) {
    const message = err?.message || "Wireframe generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
