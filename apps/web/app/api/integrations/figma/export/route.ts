export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { decryptToken } from "../../../../../lib/figma";

const FIGMA_API_BASE = "https://api.figma.com/v1";

const schema = z.object({
  wireframeId: z.string().min(1),
  fileKey: z.string().min(1),
  nodeId: z.string().min(1),
  name: z.string().min(1).default("LukeUX Wireframe")
});

/**
 * POST /api/integrations/figma/export
 * Exports a wireframe to a Figma file as a Dev Resource attached to a node.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { wireframeId, fileKey, nodeId, name } = parsed.data;

  // 1) Verify Figma connection exists
  const connection = await prisma.figmaConnection.findUnique({
    where: { userId: user.id },
    select: { accessToken: true, expiresAt: true }
  });

  if (!connection) {
    return NextResponse.json({ error: "Figma not connected. Please connect Figma first." }, { status: 403 });
  }

  if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Figma token expired. Please reconnect Figma." }, { status: 403 });
  }

  const accessToken = decryptToken(connection.accessToken);

  // 2) Verify wireframe exists and belongs to user
  const wireframe = await prisma.wireframeExport.findFirst({
    where: { id: wireframeId, userId: user.id },
    select: { id: true }
  });

  if (!wireframe) {
    return NextResponse.json({ error: "Wireframe not found" }, { status: 404 });
  }

  // 3) Build the public URL for the wireframe image
  const origin = req.headers.get("origin") || req.headers.get("x-forwarded-host")
    ? `https://${req.headers.get("x-forwarded-host")}`
    : new URL(req.url).origin;

  const wireframeUrl = `${origin}/api/wireframes/${wireframeId}/image`;

  // 4) Create a Dev Resource in the Figma file
  try {
    const response = await fetch(`${FIGMA_API_BASE}/dev_resources`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dev_resources: [
          {
            name,
            url: wireframeUrl,
            file_key: fileKey,
            node_id: nodeId
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[figma-export] Dev resource creation failed", { status: response.status, body: text });
      return NextResponse.json(
        { error: `Figma API error (${response.status}): ${text}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      console.error("[figma-export] Dev resource errors", result.errors);
      return NextResponse.json(
        { error: result.errors[0]?.error || "Failed to create dev resource", details: result.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      devResources: result.links_created || [],
      wireframeUrl
    });
  } catch (err: any) {
    console.error("[figma-export] Error", err);
    return NextResponse.json({ error: err?.message || "Export to Figma failed" }, { status: 500 });
  }
}
