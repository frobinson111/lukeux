import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  displayName: z.string().optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.apiKey.update({
    where: { id: params.id },
    data: {
      isActive: parsed.data.isActive ?? undefined,
      displayName: parsed.data.displayName ?? undefined
    }
  });

  return NextResponse.json({
    key: {
      id: updated.id,
      provider: updated.provider,
      displayName: updated.displayName,
      last4: updated.key.slice(-4),
      isActive: updated.isActive,
      createdAt: updated.createdAt
    }
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.apiKey.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}


