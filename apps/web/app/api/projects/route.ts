import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, sortOrder: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const nextOrder =
    (await prisma.project.count({
      where: { userId: user.id },
    })) || 0;

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      sortOrder: nextOrder,
    },
    select: { id: true, name: true, sortOrder: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ project });
}

