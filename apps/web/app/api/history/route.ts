import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";

const historyCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
  templateIndex: z.number().int().nullable().optional(),
  projectId: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.historyEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ history: entries });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = historyCreateSchema.safeParse(body);
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

  const entry = await prisma.historyEntry.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
      templateIndex: parsed.data.templateIndex ?? null,
      projectId: projectId ?? null,
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

  return NextResponse.json({ history: entry });
}

