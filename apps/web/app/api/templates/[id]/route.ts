import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().optional(),
  prompt: z.string().optional(),
  categoryId: z.string().optional(),
  subcategory: z.string().optional(),
  guidanceUseAiTo: z.string().optional(),
  guidanceExample: z.string().optional(),
  guidanceOutcome: z.string().optional(),
  assets: z.string().optional(),
  allowedModels: z.array(z.string()).optional(),
  allowedModes: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await _.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { categoryId, ...rest } = parsed.data;

  let categoryName: string | undefined;
  if (categoryId) {
    const cat = await prisma.templateCategory.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    categoryName = cat.name;
  }

  const tpl = await prisma.taskTemplate.update({
    where: { id: params.id },
    data: {
      category: categoryName ?? undefined,
      ...rest,
      subcategory: rest.subcategory?.trim() ?? undefined,
      guidanceUseAiTo: rest.guidanceUseAiTo ?? undefined,
      guidanceExample: rest.guidanceExample ?? undefined,
      guidanceOutcome: rest.guidanceOutcome ?? undefined,
      assets: rest.assets ?? undefined
    }
  });

  return NextResponse.json({ template: tpl }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.taskTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

