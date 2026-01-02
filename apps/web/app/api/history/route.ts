export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import { z } from "zod";

const historySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  templateIndex: z.number().int().nullable().optional(),
  projectId: z.string().optional().nullable()
});

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await prisma.historyEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        templateIndex: true,
        projectId: true,
        createdAt: true
      }
    });
    return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("[history] failed to load", err);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = historySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { title, content, templateIndex, projectId } = parsed.data;

  try {
    const entry = await prisma.historyEntry.create({
      data: {
        userId: user.id,
        title,
        content,
        templateIndex: templateIndex ?? null,
        projectId: projectId ?? null
      }
    });
    return NextResponse.json({ history: entry }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("[history] failed to save", err);
    return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
  }
}

