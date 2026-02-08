export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

/**
 * GET /api/wireframes/:id/image
 * Serves the wireframe image as a binary PNG response.
 * This is a public endpoint so Figma can fetch it for dev resource thumbnails.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const wireframe = await prisma.wireframeExport.findUnique({
    where: { id },
    select: { imageData: true, mimeType: true }
  });

  if (!wireframe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = Buffer.from(wireframe.imageData, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": wireframe.mimeType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
