export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { callLlm } from "../../../../lib/llm/service";
import { assertCanGenerate, logUsage } from "../../../../lib/usage";
import type { LlmImage, LlmPdfPage } from "@luke-ux/shared";
import { convertPdfToImages } from "../../../../lib/pdf-to-images";
import { prisma } from "../../../../lib/prisma";
import { parseFigmaUrl, buildAnalysisPrompt, detectAnalysisType } from "../../../../lib/figma-mcp";
import { decryptToken, getFigmaFile, getFigmaComments } from "../../../../lib/figma";
import { runAccessibilityAudit, parseUrls } from "../../../../lib/accessibility/audit-service";

// Supported image MIME types for vision models
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

function isImageMimeType(type: string): type is ImageMimeType {
  return IMAGE_MIME_TYPES.includes(type as ImageMimeType);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { model, prompt, mode, detailLevel, assets, figmaUrl, taskType, templateId } = body || {};
  if (!model || !prompt) {
    return NextResponse.json({ error: "Missing model or prompt" }, { status: 400 });
  }

  // Check for accessibility audit task type
  if (taskType === "accessibility") {
    return handleAccessibilityAudit(user, prompt, templateId);
  }

  // Handle Figma URL if provided - fetch design context
  let figmaContext = "";
  if (figmaUrl) {
    const urlParts = parseFigmaUrl(figmaUrl);
    if (urlParts) {
      try {
        const figmaConnection = await prisma.figmaConnection.findUnique({
          where: { userId: user.id },
        });

        if (figmaConnection && (!figmaConnection.expiresAt || figmaConnection.expiresAt > new Date())) {
          const accessToken = decryptToken(figmaConnection.accessToken);
          const fileData = await getFigmaFile(accessToken, urlParts.fileKey);

          // Detect analysis type from prompt
          const analysisType = detectAnalysisType(prompt);

          // Fetch comments if needed
          let comments = null;
          if (analysisType === 'comments' || analysisType === 'full') {
            try {
              comments = await getFigmaComments(accessToken, urlParts.fileKey);
            } catch {
              // Comments might not be available
            }
          }

          // Build Figma context
          figmaContext = buildFigmaContextString(fileData, comments, urlParts.nodeId);
          console.log(`[Figma Context] Loaded context for file: ${fileData.name}, analysis type: ${analysisType}`);
        }
      } catch (err) {
        console.error("Failed to fetch Figma context:", err);
        // Continue without Figma context
      }
    }
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

  const assetsArray: { name?: string; type?: string; content?: string; mimeType?: string }[] = Array.isArray(assets) ? assets : [];
  
  // Debug: Log what assets we received
  console.log(`[API Route] Received ${assetsArray.length} assets`);
  assetsArray.forEach((a, i) => {
    console.log(`[API Route] Asset ${i}: name=${a.name}, type=${a.type}, mimeType=${a.mimeType}, content length=${a.content?.length || 0}, starts with=${a.content?.substring(0, 30)}`);
  });
  
  // Separate images from text-based assets for proper multimodal handling
  const images: LlmImage[] = [];
  const pdfPages: LlmPdfPage[] = [];
  const textAssets: string[] = [];

  for (const a of assetsArray) {
    const name = a.name || "asset";
    const type = a.type || "unknown";
    const content = a.content || "";
    const mimeType = a.mimeType || "";

    // Check if this is an image: either explicitly typed as "image" or has image MIME type
    const isImage = type === "image" || isImageMimeType(mimeType) || content.startsWith("data:image/");

    if (isImage && content) {
      // Handle images - extract base64 data from data URL if present
      let base64Data = content;
      
      // Extract the MIME type from data URL if present
      let detectedMimeType: ImageMimeType = "image/png";
      
      if (content.startsWith("data:")) {
        // Parse data URL: "data:image/png;base64,..."
        const mimeMatch = content.match(/^data:(image\/[^;]+);base64,/);
        if (mimeMatch && isImageMimeType(mimeMatch[1])) {
          detectedMimeType = mimeMatch[1] as ImageMimeType;
        }
        
        // Extract base64 data after the comma
        const base64Start = content.indexOf(",");
        if (base64Start !== -1) {
          base64Data = content.slice(base64Start + 1);
        }
      }

      // Use explicit mimeType if provided, otherwise use detected
      const actualMimeType: ImageMimeType = isImageMimeType(mimeType) ? mimeType : detectedMimeType;

      // Log for debugging
      console.log(`[Image Processing] Name: ${name}, Type: ${type}, MimeType: ${actualMimeType}, Base64 length: ${base64Data.length}`);

      images.push({
        name,
        mimeType: actualMimeType,
        base64Data
      });
    } else if (type === "pdf" || mimeType === "application/pdf") {
      // Handle PDFs - convert to images for visual analysis
      try {
        let base64Data = content;
        if (content.startsWith("data:")) {
          const base64Start = content.indexOf(",");
          if (base64Start !== -1) {
            base64Data = content.slice(base64Start + 1);
          }
        }
        
        const pageImages = await convertPdfToImages(base64Data, { maxPages: 5 });
        for (const page of pageImages) {
          pdfPages.push({
            name: `${name} - Page ${page.pageNumber}`,
            pageNumber: page.pageNumber,
            mimeType: "image/png",
            base64Data: page.base64Data
          });
        }
      } catch (pdfErr) {
        console.error("PDF conversion failed:", pdfErr);
        // Fall back to text mention
        textAssets.push(`- ${name} (PDF - could not render for visual analysis)`);
      }
    } else {
      // Handle text-based assets
      const capped = content.length > 2000 ? `${content.slice(0, 2000)}\n...[truncated]` : content;
      textAssets.push(`- ${name} (${type}):\n${capped}`);
    }
  }

  // Build text assets section for non-visual content
  const assetsSectionRaw = textAssets.join("\n\n");

  const MAX_ASSETS_SECTION = 50_000;
  const assetsSection =
    assetsSectionRaw.length > MAX_ASSETS_SECTION
      ? `${assetsSectionRaw.slice(0, MAX_ASSETS_SECTION)}\n...[assets truncated to stay within token limits]`
      : assetsSectionRaw;

  // Build prompt with image context
  const hasVisualContent = images.length > 0 || pdfPages.length > 0;
  const imageContext = hasVisualContent
    ? `\n\nI have attached ${images.length} image(s)${pdfPages.length > 0 ? ` and ${pdfPages.length} PDF page(s)` : ""} for your visual analysis.`
    : "";

  // Build the full prompt with optional Figma context
  let fullPrompt = prompt;

  // Add Figma context if available
  if (figmaContext) {
    fullPrompt = `${prompt}\n\n## Figma Design Context\n${figmaContext}`;
  }

  // Add image context
  if (imageContext) {
    fullPrompt = `${fullPrompt}${imageContext}`;
  }

  // Add text assets
  if (assetsSection && assetsSection.length > 0) {
    fullPrompt = `${fullPrompt}\n\nText Assets provided:\n${assetsSection}`;
  }

  // Add detail suffix
  fullPrompt = `${fullPrompt}\n\n${detailSuffix}`;

  // Define ids up front
  const taskId = crypto.randomUUID();
  const threadId = crypto.randomUUID();

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

  // Log what's being sent to LLM
  console.log(`[LLM Request] Model: ${model}, Images: ${images.length}, PDF Pages: ${pdfPages.length}, Text Assets: ${textAssets.length}`);
  if (images.length > 0) {
    console.log(`[LLM Request] Image names: ${images.map(i => i.name).join(", ")}`);
  }

  const response = await callLlm({
    prompt: fullPrompt,
    model,
    mode: selectedMode as any,
    images: images.length > 0 ? images : undefined,
    pdfPages: pdfPages.length > 0 ? pdfPages : undefined
  });
  await logUsage(user.id, {
    type: "GENERATION",
    taskId,
    model,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut
  });

  // Generate Luke UX Recommendation by analyzing the response
  const recommendationPrompt = `You are a UX expert assistant. Based on the following UX analysis output, provide a single concise, actionable recommendation (2-4 sentences) that summarizes the most important thing the user should prioritize or do next.

Analysis Output:
${response.content}

Provide ONLY the recommendation text - no headers, no markdown formatting, no bullet points. Just 2-4 clear sentences with a specific action to take.`;

  let recommendation: string | null = null;
  try {
    const recResponse = await callLlm({
      prompt: recommendationPrompt,
      model,
      mode: "instant" as any
    });
    recommendation = recResponse.content?.trim() || null;
  } catch (err) {
    console.error("Failed to generate recommendation:", err);
    // Continue without recommendation if it fails
  }

  return NextResponse.json({
    content: response.content,
    recommendation,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    taskId,
    threadId,
    figmaContextLoaded: !!figmaContext
  });
}

/**
 * Build a context string from Figma file data for LLM analysis
 */
function buildFigmaContextString(fileData: any, comments: any, nodeId?: string): string {
  const sections: string[] = [];

  sections.push(`### File: ${fileData.name}`);
  sections.push(`Last Modified: ${fileData.lastModified}`);
  sections.push('');

  // Components summary
  const components = fileData.components || {};
  const componentSets = fileData.componentSets || {};
  const componentCount = Object.keys(components).length;
  const componentSetCount = Object.keys(componentSets).length;

  if (componentCount > 0 || componentSetCount > 0) {
    sections.push('### Components');
    sections.push(`- ${componentCount} components defined`);
    sections.push(`- ${componentSetCount} component sets (variants)`);

    // List top component names
    const componentNames = Object.values(components)
      .map((c: any) => c.name)
      .slice(0, 15);
    if (componentNames.length > 0) {
      sections.push('');
      sections.push('Key components:');
      componentNames.forEach((name) => sections.push(`  - ${name}`));
    }
    sections.push('');
  }

  // Styles summary
  const styles = fileData.styles || {};
  const styleCount = Object.keys(styles).length;
  if (styleCount > 0) {
    const styleList = Object.values(styles) as any[];
    const textStyles = styleList.filter((s) => s.styleType === 'TEXT').length;
    const fillStyles = styleList.filter((s) => s.styleType === 'FILL').length;
    const effectStyles = styleList.filter((s) => s.styleType === 'EFFECT').length;

    sections.push('### Design Tokens');
    sections.push(`- ${textStyles} text styles`);
    sections.push(`- ${fillStyles} color/fill styles`);
    sections.push(`- ${effectStyles} effect styles`);
    sections.push('');
  }

  // Document structure summary
  if (fileData.document) {
    const doc = fileData.document;
    const pages = doc.children || [];
    sections.push('### Document Structure');
    sections.push(`- ${pages.length} pages`);

    pages.slice(0, 5).forEach((page: any) => {
      const frameCount = page.children?.filter((c: any) => c.type === 'FRAME').length || 0;
      sections.push(`  - ${page.name}: ${frameCount} frames`);
    });

    if (pages.length > 5) {
      sections.push(`  ... and ${pages.length - 5} more pages`);
    }
    sections.push('');
  }

  // Comments summary
  if (comments?.comments && comments.comments.length > 0) {
    const allComments = comments.comments;
    const unresolvedComments = allComments.filter((c: any) => !c.resolved_at);

    sections.push('### Comments');
    sections.push(`- ${allComments.length} total comments`);
    sections.push(`- ${unresolvedComments.length} unresolved`);

    if (unresolvedComments.length > 0) {
      sections.push('');
      sections.push('Recent unresolved feedback:');
      unresolvedComments.slice(0, 5).forEach((comment: any) => {
        const msg = comment.message?.substring(0, 80) || '';
        const user = comment.user?.handle || 'Unknown';
        sections.push(`  - "${msg}${msg.length >= 80 ? '...' : ''}" - @${user}`);
      });
    }
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Handle accessibility audit task type
 */
async function handleAccessibilityAudit(
  user: { id: string; plan: any; planStatus: any },
  prompt: string,
  templateId?: string
) {
  // Assert usage limits
  try {
    await assertCanGenerate({
      userId: user.id,
      plan: user.plan as any,
      planStatus: user.planStatus as any,
      generationLimit: (user as any).generationLimit ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Generation limit reached." },
      { status: 402 }
    );
  }

  // Parse URLs from the prompt (user enters URLs in the text input)
  const urls = parseUrls(prompt);

  if (urls.length === 0) {
    return NextResponse.json(
      {
        error:
          "Please enter one or more valid URLs to audit (e.g., https://example.com). Separate multiple URLs with commas or newlines.",
      },
      { status: 400 }
    );
  }

  // Get accessibility config from template if available
  let maxPages = 3;
  if (templateId) {
    try {
      const template = await prisma.taskTemplate.findUnique({
        where: { id: templateId },
        select: { accessibilityConfig: true },
      });
      if (template?.accessibilityConfig) {
        const config = template.accessibilityConfig as { maxPages?: number };
        maxPages = config.maxPages ?? 3;
      }
    } catch {
      // Use default config
    }
  }

  console.log(
    `[Accessibility Audit] Starting audit for ${urls.length} URL(s): ${urls.join(", ")}`
  );

  try {
    const result = await runAccessibilityAudit({
      urls,
      config: { maxPages },
    });

    // Log usage
    await logUsage(user.id, {
      type: "GENERATION",
      taskId: result.taskId,
      model: "accessibility-audit",
      tokensIn: 0, // No LLM tokens for accessibility audits
      tokensOut: 0,
    });

    console.log(
      `[Accessibility Audit] Completed: ${result.auditMetadata.urlsScanned} URLs scanned, ${result.auditMetadata.totalViolations} violations found, status: ${result.auditMetadata.overallStatus}`
    );

    return NextResponse.json({
      content: result.content,
      recommendation: result.recommendation,
      taskId: result.taskId,
      threadId: result.threadId,
      tokensIn: 0,
      tokensOut: 0,
      auditMetadata: result.auditMetadata,
    });
  } catch (err: any) {
    console.error("[Accessibility Audit] Error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Failed to run accessibility audit. Please check the URLs and try again.",
      },
      { status: 500 }
    );
  }
}
