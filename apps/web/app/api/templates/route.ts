import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const templateSchema = z.object({
  categoryId: z.string().min(1),
  subcategory: z.string().optional(),
  title: z.string().min(1),
  prompt: z.string().min(1),
  guidanceUseAiTo: z.string().optional(),
  guidanceExample: z.string().optional(),
  guidanceOutcome: z.string().optional(),
  assets: z.string().optional(),
  allowedModels: z.array(z.string()).default([]),
  allowedModes: z.array(z.string()).default([]),
  isActive: z.boolean().optional().default(true)
});

export async function GET() {
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { title: "asc" }]
  });
  return NextResponse.json({ templates }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const category = await prisma.templateCategory.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 400 });
  }

  const tpl = await prisma.taskTemplate.create({
    data: {
      category: category.name,
      subcategory: parsed.data.subcategory?.trim() || "",
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      guidanceUseAiTo: parsed.data.guidanceUseAiTo ?? null,
      guidanceExample: parsed.data.guidanceExample ?? null,
      guidanceOutcome: parsed.data.guidanceOutcome ?? null,
      assets: parsed.data.assets ?? null,
      allowedModels: parsed.data.allowedModels,
      allowedModes: parsed.data.allowedModes,
      isActive: parsed.data.isActive,
      createdById: user.id
    }
  });

  return NextResponse.json({ template: tpl }, { headers: { "Cache-Control": "no-store" } });
}

