export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";
import { z } from "zod";

const createModelSchema = z.object({
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// GET - List all LLM models (admin only)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const models = await prisma.llmModel.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Failed to fetch LLM models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

// POST - Create a new LLM model (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createModelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid model data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check for duplicate modelId
    const existing = await prisma.llmModel.findUnique({
      where: { modelId: parsed.data.modelId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A model with this ID already exists" },
        { status: 409 }
      );
    }

    const model = await prisma.llmModel.create({
      data: {
        modelId: parsed.data.modelId,
        displayName: parsed.data.displayName,
        provider: parsed.data.provider,
        isEnabled: parsed.data.isEnabled ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error("Failed to create LLM model:", error);
    return NextResponse.json({ error: "Failed to create model" }, { status: 500 });
  }
}
