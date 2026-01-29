import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { subcategory: "asc" }, { title: "asc" }],
    select: {
      id: true,
      category: true,
      subcategory: true,
      title: true,
      guidanceUseAiTo: true,
      guidanceExample: true,
      guidanceOutcome: true,
      TemplateCategory: {
        select: {
          name: true
        }
      }
    }
  });
  return NextResponse.json({ templates }, { headers: { "Cache-Control": "no-store" } });
}
