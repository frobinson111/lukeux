export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

const schema = z.object({
  imageData: z.string().min(1),
  mimeType: z.string().default("image/png"),
  fileName: z.string().optional(),
  sourceUrl: z.string().optional()
});

/**
 * POST /api/wireframes
 * Save a wireframe image to the database and return its public-accessible ID.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Strip the data URL prefix if present to store raw base64
  let { imageData } = parsed.data;
  const dataUrlMatch = imageData.match(/^data:[^;]+;base64,(.*)$/);
  if (dataUrlMatch) {
    imageData = dataUrlMatch[1];
  }

  const wireframe = await prisma.wireframeExport.create({
    data: {
      userId: user.id,
      imageData,
      mimeType: parsed.data.mimeType,
      fileName: parsed.data.fileName,
      sourceUrl: parsed.data.sourceUrl
    }
  });

  return NextResponse.json({ id: wireframe.id });
}
