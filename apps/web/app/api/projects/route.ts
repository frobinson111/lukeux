import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  sortOrder: z.number().int().optional().nullable()
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, sortOrder: true, createdAt: true }
    });
    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error("[projects] failed to load", err);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, description, sortOrder } = parsed.data;

  try {
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name,
        description: description ?? null,
        sortOrder: sortOrder ?? 0
      },
      select: { id: true, name: true, description: true, sortOrder: true, createdAt: true }
    });
    return NextResponse.json({ project }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("[projects] failed to create", err);
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}

