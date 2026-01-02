export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const existing = await prisma.historyEntry.findFirst({
      where: { id, userId: user.id },
      select: { id: true }
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.historyEntry.delete({
      where: { id }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[history] delete failed", err);
    return NextResponse.json({ error: "Failed to delete history" }, { status: 500 });
  }
}

