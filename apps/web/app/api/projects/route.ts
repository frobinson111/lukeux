import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";

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

