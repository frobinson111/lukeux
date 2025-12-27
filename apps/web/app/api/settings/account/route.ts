import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  workDescription: z.string().max(5000).optional()
});

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, any> = {};
  if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName.trim();
  if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName.trim();
  if (parsed.data.workDescription !== undefined) data.workDescription = parsed.data.workDescription.trim();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { firstName: true, lastName: true, workDescription: true, email: true }
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } })
  ]);

  return NextResponse.json({ ok: true });
}


