export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { requireUser } from "../../../../lib/auth";

const schema = z.object({
  prompt: z.string().min(1),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).default("1024x1024"),
  n: z.number().int().min(1).max(4).default(1)
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { prompt, size, n } = parsed.data;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Image generation not configured" }, { status: 500 });
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      n,
      response_format: "b64_json"
    });

    const images =
      response.data?.map((img: any) => {
        if (!img.b64_json) return null;
        return `data:image/png;base64,${img.b64_json}`;
      })?.filter(Boolean) ?? [];

    return NextResponse.json({ images });
  } catch (err: any) {
    const message = err?.message || "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


