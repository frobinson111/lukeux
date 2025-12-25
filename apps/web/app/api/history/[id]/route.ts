import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  projectId: z.string().trim().min(1).nullable().optional(),
});

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await _.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const { projectId } = parsed.data;

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const updated = await prisma.historyEntry.update({
    where: { id: params.id, userId: user.id },
    data: {
      title: parsed.data.title,
      projectId: parsed.data.projectId ?? null,
    },
    select: {
      id: true,
      title: true,
      content: true,
      templateIndex: true,
      projectId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ history: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.historyEntry.deleteMany({
    where: { id: params.id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}

