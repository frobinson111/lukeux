export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCurrentUser } from "../../../../../lib/auth";
import { z } from "zod";

const updateModelSchema = z.object({
  displayName: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// PATCH - Update an LLM model (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.llmModel.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateModelSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid model data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const model = await prisma.llmModel.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.displayName !== undefined && { displayName: parsed.data.displayName }),
        ...(parsed.data.isEnabled !== undefined && { isEnabled: parsed.data.isEnabled }),
        ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
      },
    });

    return NextResponse.json({ model });
  } catch (error) {
    console.error("Failed to update LLM model:", error);
    return NextResponse.json({ error: "Failed to update model" }, { status: 500 });
  }
}

// DELETE - Delete an LLM model (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.llmModel.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    await prisma.llmModel.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete LLM model:", error);
    return NextResponse.json({ error: "Failed to delete model" }, { status: 500 });
  }
}
