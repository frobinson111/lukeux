export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

// GET - List all playbook items (admin)
export async function GET() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [items, config] = await Promise.all([
    prisma.playbookItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.playbookConfig.findFirst(),
  ]);

  return NextResponse.json({
    items,
    config: config ?? { visibleCount: 3 },
  });
}

// POST - Create a new playbook item
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      audioUrl,
      videoUrl,
      documentUrl,
      showAudio,
      showVideo,
      showDocument,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get the next sort order
    const maxSort = await prisma.playbookItem.aggregate({
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    const item = await prisma.playbookItem.create({
      data: {
        title: title.trim(),
        audioUrl: audioUrl?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        documentUrl: documentUrl?.trim() || null,
        showAudio: !!showAudio,
        showVideo: !!showVideo,
        showDocument: !!showDocument,
        sortOrder: nextSort,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating playbook item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create playbook item" },
      { status: 500 }
    );
  }
}

// PUT - Update a playbook item
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      title,
      audioUrl,
      videoUrl,
      documentUrl,
      showAudio,
      showVideo,
      showDocument,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existing = await prisma.playbookItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Playbook item not found" }, { status: 404 });
    }

    const item = await prisma.playbookItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(audioUrl !== undefined && { audioUrl: audioUrl?.trim() || null }),
        ...(videoUrl !== undefined && { videoUrl: videoUrl?.trim() || null }),
        ...(documentUrl !== undefined && { documentUrl: documentUrl?.trim() || null }),
        ...(showAudio !== undefined && { showAudio: !!showAudio }),
        ...(showVideo !== undefined && { showVideo: !!showVideo }),
        ...(showDocument !== undefined && { showDocument: !!showDocument }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating playbook item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update playbook item" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a playbook item
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

  const existing = await prisma.playbookItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Playbook item not found" }, { status: 404 });
  }

  await prisma.playbookItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// PATCH - Reorder items or update config
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Update visible count config
    if (body.visibleCount !== undefined) {
      const count = Number(body.visibleCount);
      if (isNaN(count) || count < 1) {
        return NextResponse.json({ error: "visibleCount must be a positive number" }, { status: 400 });
      }

      const existing = await prisma.playbookConfig.findFirst();
      if (existing) {
        await prisma.playbookConfig.update({
          where: { id: existing.id },
          data: { visibleCount: count },
        });
      } else {
        await prisma.playbookConfig.create({
          data: { visibleCount: count },
        });
      }

      return NextResponse.json({ visibleCount: count });
    }

    // Reorder items
    if (body.orderedIds && Array.isArray(body.orderedIds)) {
      const ids: string[] = body.orderedIds;
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.playbookItem.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error in playbook PATCH:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
