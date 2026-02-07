export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { z } from "zod";
import { sanitizeTemplateHtml } from "@luke-ux/shared";
import { Prisma } from "@prisma/client";

const updateTemplateSchema = z.object({
  category: z.string().min(1).optional(),
  subcategory: z.string().optional(), // Allow empty string for optional subcategory
  title: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  guidanceUseAiTo: z.string().nullable().optional(),
  guidanceExample: z.string().nullable().optional(),
  guidanceOutcome: z.string().nullable().optional(),
  assets: z.string().nullable().optional(),
  allowedModes: z.array(z.string()).optional(),
  allowedModels: z.array(z.string()).optional(),
  allowUrlInput: z.boolean().optional(),
  allowFileUploads: z.boolean().optional(),
  allowMockupGeneration: z.boolean().optional(),
  allowRefineAnalysis: z.boolean().optional(),
  allowWireframeRenderer: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  templateCategoryId: z.string().nullable().optional(),
  taskType: z.enum(["llm", "accessibility"]).optional(),
  accessibilityConfig: z.object({
    maxPages: z.number().min(1).max(10).optional(),
  }).nullable().optional(),
  defaultModel: z.string().nullable().optional(),
  defaultMode: z.enum(["auto", "instant", "thinking"]).nullable().optional(),
  defaultDetailLevel: z.enum(["brief", "standard", "in-depth"]).nullable().optional(),
});

// GET - Get a single template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.taskTemplate.findUnique({
      where: { id: params.id },
      include: { TemplateCategory: true }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

// PATCH - Update a template (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.taskTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid template data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Sanitize HTML in guidance fields if they are being updated
    const sanitizedGuidanceUseAiTo = parsed.data.guidanceUseAiTo !== undefined
      ? (parsed.data.guidanceUseAiTo ? sanitizeTemplateHtml(parsed.data.guidanceUseAiTo) || null : null)
      : undefined;
    const sanitizedGuidanceExample = parsed.data.guidanceExample !== undefined
      ? (parsed.data.guidanceExample ? sanitizeTemplateHtml(parsed.data.guidanceExample) || null : null)
      : undefined;
    const sanitizedGuidanceOutcome = parsed.data.guidanceOutcome !== undefined
      ? (parsed.data.guidanceOutcome ? sanitizeTemplateHtml(parsed.data.guidanceOutcome) || null : null)
      : undefined;
    const sanitizedAssets = parsed.data.assets !== undefined
      ? (parsed.data.assets ? sanitizeTemplateHtml(parsed.data.assets) || null : null)
      : undefined;

    const template = await prisma.taskTemplate.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.category !== undefined && { category: parsed.data.category }),
        ...(parsed.data.subcategory !== undefined && { subcategory: parsed.data.subcategory }),
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.prompt !== undefined && { prompt: parsed.data.prompt }),
        ...(sanitizedGuidanceUseAiTo !== undefined && { guidanceUseAiTo: sanitizedGuidanceUseAiTo }),
        ...(sanitizedGuidanceExample !== undefined && { guidanceExample: sanitizedGuidanceExample }),
        ...(sanitizedGuidanceOutcome !== undefined && { guidanceOutcome: sanitizedGuidanceOutcome }),
        ...(sanitizedAssets !== undefined && { assets: sanitizedAssets }),
        ...(parsed.data.allowedModes !== undefined && { allowedModes: parsed.data.allowedModes }),
        ...(parsed.data.allowedModels !== undefined && { allowedModels: parsed.data.allowedModels }),
        ...(parsed.data.allowUrlInput !== undefined && { allowUrlInput: parsed.data.allowUrlInput }),
        ...(parsed.data.allowFileUploads !== undefined && { allowFileUploads: parsed.data.allowFileUploads }),
        ...(parsed.data.allowMockupGeneration !== undefined && { allowMockupGeneration: parsed.data.allowMockupGeneration }),
        ...(parsed.data.allowRefineAnalysis !== undefined && { allowRefineAnalysis: parsed.data.allowRefineAnalysis }),
        ...(parsed.data.allowWireframeRenderer !== undefined && { allowWireframeRenderer: parsed.data.allowWireframeRenderer }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        ...(parsed.data.isPopular !== undefined && { isPopular: parsed.data.isPopular }),
        ...(parsed.data.templateCategoryId !== undefined && { templateCategoryId: parsed.data.templateCategoryId }),
        ...(parsed.data.taskType !== undefined && { taskType: parsed.data.taskType }),
        ...(parsed.data.accessibilityConfig !== undefined && {
          accessibilityConfig: parsed.data.accessibilityConfig === null
            ? Prisma.JsonNull
            : parsed.data.accessibilityConfig
        }),
        ...(parsed.data.defaultModel !== undefined && { defaultModel: parsed.data.defaultModel }),
        ...(parsed.data.defaultMode !== undefined && { defaultMode: parsed.data.defaultMode }),
        ...(parsed.data.defaultDetailLevel !== undefined && { defaultDetailLevel: parsed.data.defaultDetailLevel }),
      }
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE - Delete a template (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.taskTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.taskTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
