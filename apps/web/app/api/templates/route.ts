export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { z } from "zod";

const templateSchema = z.object({
  category: z.string().min(1),
  subcategory: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  guidanceUseAiTo: z.string().nullable().optional(),
  guidanceExample: z.string().nullable().optional(),
  guidanceOutcome: z.string().nullable().optional(),
  assets: z.string().nullable().optional(),
  allowedModes: z.array(z.string()).optional(),
  allowedModels: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  templateCategoryId: z.string().nullable().optional(),
});

export async function GET() {
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { title: "asc" }]
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

    const template = await prisma.taskTemplate.create({
      data: {
        category: parsed.data.category,
        subcategory: parsed.data.subcategory,
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        guidanceUseAiTo: parsed.data.guidanceUseAiTo || null,
        guidanceExample: parsed.data.guidanceExample || null,
        guidanceOutcome: parsed.data.guidanceOutcome || null,
        assets: parsed.data.assets || null,
        allowedModes: parsed.data.allowedModes || ["auto", "instant", "thinking"],
        allowedModels: parsed.data.allowedModels || [],
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

