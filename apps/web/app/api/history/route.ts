import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";

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

