export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { decryptToken } from "../../../../../lib/figma";

const FIGMA_API_BASE = "https://api.figma.com/v1";

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
};

function flattenNodes(node: FigmaNode, depth = 0, maxDepth = 2): { id: string; name: string; type: string; depth: number }[] {
  const result: { id: string; name: string; type: string; depth: number }[] = [];
  result.push({ id: node.id, name: node.name, type: node.type, depth });
  if (depth < maxDepth && node.children) {
    for (const child of node.children) {
      result.push(...flattenNodes(child, depth + 1, maxDepth));
    }
  }
  return result;
}

/**
 * GET /api/integrations/figma/nodes?fileKey=xxx
 * Returns the top-level page and frame nodes from a Figma file for node selection.
 */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileKey = searchParams.get("fileKey");

  if (!fileKey) {
    return NextResponse.json({ error: "fileKey required" }, { status: 400 });
  }

  const connection = await prisma.figmaConnection.findUnique({
    where: { userId: user.id },
    select: { accessToken: true, expiresAt: true }
  });

  if (!connection) {
    return NextResponse.json({ error: "Figma not connected" }, { status: 403 });
  }

  if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Figma token expired" }, { status: 403 });
  }

  const accessToken = decryptToken(connection.accessToken);

  try {
    // Fetch file with depth=2 to get pages and their top-level children (frames)
    const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}?depth=2`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch Figma file" }, { status: response.status });
    }

    const data = await response.json();
    const document = data.document as FigmaNode;

    // Flatten pages and their top-level frames
    const nodes = flattenNodes(document, 0, 2).filter(
      (n) => n.type === "CANVAS" || n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SECTION"
    );

    return NextResponse.json({ nodes, fileName: data.name });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch nodes" }, { status: 500 });
  }
}
