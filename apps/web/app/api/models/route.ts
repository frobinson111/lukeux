export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";

// GET - Get enabled LLM models for the user-facing dropdown
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const models = await prisma.llmModel.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: "asc" },
      select: {
        modelId: true,
        displayName: true,
        provider: true,
      },
    });

    return NextResponse.json({ models }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to fetch enabled models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
