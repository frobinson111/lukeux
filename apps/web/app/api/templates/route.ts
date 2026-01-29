export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { z } from "zod";
import { sanitizeTemplateHtml } from "@luke-ux/shared";

const templateSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().optional(), // Made optional - can be empty
  title: z.string().min(1),
  prompt: z.string().min(1),
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
  isActive: z.boolean().optional(),
  templateCategoryId: z.string().nullable().optional(),
});

export async function GET() {
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { subcategory: "asc" }, { title: "asc" }],
    include: {
      TemplateCategory: {
        select: { name: true, sortOrder: true }
      }
    }
  });
  return NextResponse.json({ templates }, { headers: { "Cache-Control": "no-store" } });
}

// POST - Create a new template (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = templateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid template data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Sanitize HTML in guidance fields before storing
    const sanitizedGuidanceUseAiTo = parsed.data.guidanceUseAiTo 
      ? sanitizeTemplateHtml(parsed.data.guidanceUseAiTo) || null 
      : null;
    const sanitizedGuidanceExample = parsed.data.guidanceExample 
      ? sanitizeTemplateHtml(parsed.data.guidanceExample) || null 
      : null;
    const sanitizedGuidanceOutcome = parsed.data.guidanceOutcome 
      ? sanitizeTemplateHtml(parsed.data.guidanceOutcome) || null 
      : null;
    const sanitizedAssets = parsed.data.assets 
      ? sanitizeTemplateHtml(parsed.data.assets) || null 
      : null;

    const template = await prisma.taskTemplate.create({
      data: {
        category: parsed.data.category,
        subcategory: parsed.data.subcategory || "", // Default to empty string if not provided
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        guidanceUseAiTo: sanitizedGuidanceUseAiTo,
        guidanceExample: sanitizedGuidanceExample,
        guidanceOutcome: sanitizedGuidanceOutcome,
        assets: sanitizedAssets,
        allowedModes: parsed.data.allowedModes || ["auto", "instant", "thinking"],
        allowedModels: parsed.data.allowedModels || [],
        allowUrlInput: parsed.data.allowUrlInput ?? false,
        allowFileUploads: parsed.data.allowFileUploads ?? true,
        allowMockupGeneration: parsed.data.allowMockupGeneration ?? true,
        allowRefineAnalysis: parsed.data.allowRefineAnalysis ?? true,
        isActive: parsed.data.isActive ?? true,
        templateCategoryId: parsed.data.templateCategoryId || null,
        createdById: user.id,
      }
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
