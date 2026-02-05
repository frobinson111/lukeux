export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    // First check if the project exists and belongs to the user
    const project = await prisma.project.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the project (cascade will handle related HistoryEntry and Task records)
    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("[projects] failed to delete", err);
    return NextResponse.json({ error: "Failed to delete project." }, { status: 500 });
  }
}
