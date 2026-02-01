export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { decryptToken, getFigmaFile, getFigmaComments } from "../../../../lib/figma";
import { parseFigmaUrl, formatFigmaContextForAnalysis, detectAnalysisType } from "../../../../lib/figma-mcp";

const RequestSchema = z.object({
  figmaUrl: z.string().url(),
  analysisType: z.enum(['design-system', 'layout', 'flow', 'comments', 'fidelity', 'full']).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Parse the Figma URL
  const urlParts = parseFigmaUrl(body.figmaUrl);
  if (!urlParts) {
    return NextResponse.json({ error: "Invalid Figma URL" }, { status: 400 });
  }

  // Check if user has Figma connected
  const figmaConnection = await prisma.figmaConnection.findUnique({
    where: { userId: user.id },
  });

  if (!figmaConnection) {
    return NextResponse.json(
      { error: "Figma not connected", requiresConnection: true },
      { status: 403 }
    );
  }

  // Check if token is expired
  if (figmaConnection.expiresAt && figmaConnection.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Figma connection expired", requiresReconnection: true },
      { status: 403 }
    );
  }

  try {
    // Decrypt the access token
    const accessToken = decryptToken(figmaConnection.accessToken);

    // Fetch file data using REST API
    const fileData = await getFigmaFile(accessToken, urlParts.fileKey);

    // Fetch comments if doing comment analysis
    let comments = null;
    const analysisType = body.analysisType || detectAnalysisType('');
    if (analysisType === 'comments' || analysisType === 'full') {
      try {
        comments = await getFigmaComments(accessToken, urlParts.fileKey);
      } catch {
        // Comments might not be available
      }
    }

    // Extract relevant context for analysis
    const context = {
      fileName: fileData.name,
      lastModified: fileData.lastModified,
      version: fileData.version,
      document: extractDocumentStructure(fileData.document, urlParts.nodeId),
      components: fileData.components || {},
      componentSets: fileData.componentSets || {},
      styles: fileData.styles || {},
      comments: comments?.comments || [],
    };

    // Format for LukeUX analysis
    const formattedContext = formatContextForLukeUX(context, analysisType);

    return NextResponse.json({
      success: true,
      fileKey: urlParts.fileKey,
      nodeId: urlParts.nodeId,
      fileName: context.fileName,
      analysisType,
      context: formattedContext,
      raw: context,
    });
  } catch (error) {
    console.error("Figma analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze Figma file" },
      { status: 500 }
    );
  }
}

/**
 * Extract document structure, optionally focused on a specific node
 */
function extractDocumentStructure(document: any, nodeId?: string): any {
  if (!nodeId) {
    return summarizeNode(document, 3); // Limit depth for full document
  }

  // Find the specific node
  const node = findNode(document, nodeId);
  if (node) {
    return summarizeNode(node, 5); // More depth for specific node
  }

  return summarizeNode(document, 3);
}

/**
 * Find a node by ID in the document tree
 */
function findNode(node: any, targetId: string): any {
  if (node.id === targetId) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, targetId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Summarize a node tree to a manageable size
 */
function summarizeNode(node: any, maxDepth: number, currentDepth = 0): any {
  if (!node) return null;

  const summary: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // Include relevant properties based on type
  if (node.type === 'TEXT') {
    summary.characters = node.characters?.substring(0, 200);
  }

  if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    if (node.layoutMode) summary.layoutMode = node.layoutMode;
    if (node.primaryAxisAlignItems) summary.primaryAxisAlign = node.primaryAxisAlignItems;
    if (node.counterAxisAlignItems) summary.counterAxisAlign = node.counterAxisAlignItems;
    if (node.itemSpacing) summary.itemSpacing = node.itemSpacing;
    if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
      summary.padding = {
        left: node.paddingLeft,
        right: node.paddingRight,
        top: node.paddingTop,
        bottom: node.paddingBottom,
      };
    }
  }

  if (node.type === 'INSTANCE') {
    summary.componentId = node.componentId;
  }

  // Include children if within depth limit
  if (node.children && currentDepth < maxDepth) {
    summary.children = node.children.map((child: any) =>
      summarizeNode(child, maxDepth, currentDepth + 1)
    );
    summary.childCount = node.children.length;
  } else if (node.children) {
    summary.childCount = node.children.length;
  }

  return summary;
}

/**
 * Format context specifically for LukeUX analysis
 */
function formatContextForLukeUX(
  context: any,
  analysisType: string
): string {
  const sections: string[] = [];

  sections.push(`# Figma File: ${context.fileName}`);
  sections.push(`Last Modified: ${context.lastModified}`);
  sections.push('');

  // Components section
  const componentCount = Object.keys(context.components).length;
  const componentSetCount = Object.keys(context.componentSets).length;
  if (componentCount > 0 || componentSetCount > 0) {
    sections.push('## Design System Components');
    sections.push(`- ${componentCount} components`);
    sections.push(`- ${componentSetCount} component sets (variants)`);

    // List component names
    const componentNames = Object.values(context.components)
      .map((c: any) => c.name)
      .slice(0, 20);
    if (componentNames.length > 0) {
      sections.push('\nComponent Names:');
      componentNames.forEach((name) => sections.push(`  - ${name}`));
      if (componentCount > 20) {
        sections.push(`  ... and ${componentCount - 20} more`);
      }
    }
    sections.push('');
  }

  // Styles section
  const styleCount = Object.keys(context.styles).length;
  if (styleCount > 0) {
    sections.push('## Design Tokens/Styles');
    sections.push(`- ${styleCount} styles defined`);

    const styles = Object.values(context.styles) as any[];
    const textStyles = styles.filter((s) => s.styleType === 'TEXT');
    const fillStyles = styles.filter((s) => s.styleType === 'FILL');
    const effectStyles = styles.filter((s) => s.styleType === 'EFFECT');

    if (textStyles.length > 0) sections.push(`  - ${textStyles.length} text styles`);
    if (fillStyles.length > 0) sections.push(`  - ${fillStyles.length} fill/color styles`);
    if (effectStyles.length > 0) sections.push(`  - ${effectStyles.length} effect styles`);
    sections.push('');
  }

  // Document structure
  sections.push('## Document Structure');
  sections.push('```json');
  sections.push(JSON.stringify(context.document, null, 2).substring(0, 5000));
  sections.push('```');
  sections.push('');

  // Comments section (if relevant)
  if (context.comments && context.comments.length > 0 &&
      (analysisType === 'comments' || analysisType === 'full')) {
    sections.push('## Comments');
    sections.push(`- ${context.comments.length} comments`);

    const unresolvedComments = context.comments.filter((c: any) => !c.resolved_at);
    if (unresolvedComments.length > 0) {
      sections.push(`- ${unresolvedComments.length} unresolved`);
      sections.push('\nRecent Unresolved Comments:');
      unresolvedComments.slice(0, 10).forEach((comment: any) => {
        sections.push(`  - "${comment.message?.substring(0, 100)}..." by ${comment.user?.handle || 'Unknown'}`);
      });
    }
    sections.push('');
  }

  return sections.join('\n');
}
