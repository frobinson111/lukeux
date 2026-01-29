export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const categories = await prisma.templateCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { TaskTemplate: true }
      }
    }
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, sortOrder } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check for duplicate (case-insensitive)
    const existingCategories = await prisma.templateCategory.findMany();
    const duplicate = existingCategories.find(
      (cat) => cat.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "A framework with this name already exists" },
        { status: 400 }
      );
    }

    const category = await prisma.templateCategory.create({
      data: {
        name: trimmedName,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, sortOrder } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // If updating name, check for duplicates (case-insensitive)
  if (name) {
    const trimmedName = name.trim();
    const existingCategories = await prisma.templateCategory.findMany();
    const duplicate = existingCategories.find(
      (cat) => cat.id !== id && cat.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "A framework with this name already exists" },
        { status: 400 }
      );
    }
  }

  const category = await prisma.templateCategory.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(typeof sortOrder === "number" && { sortOrder }),
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Check if category has templates
  const category = await prisma.templateCategory.findUnique({
    where: { id },
    include: { _count: { select: { TaskTemplate: true } } },
  });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (category._count.TaskTemplate > 0) {
    return NextResponse.json(
      { error: `Cannot delete category with ${category._count.TaskTemplate} linked templates` },
      { status: 400 }
    );
  }

  await prisma.templateCategory.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
