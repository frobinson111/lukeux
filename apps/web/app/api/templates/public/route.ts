import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      guidanceUseAiTo: true,
      guidanceExample: true,
      guidanceOutcome: true
    }
  });
  return NextResponse.json({ templates }, { headers: { "Cache-Control": "no-store" } });
}


