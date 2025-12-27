import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

const schema = z.object({
  userId: z.string().min(1),
  plan: z.enum(["FREE", "PRO"])
});

export async function PATCH(req: Request) {
  const admin = await requireUser();
  if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { userId, plan } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { plan, planStatus: "ACTIVE" }
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      plan: updated.plan,
      planStatus: updated.planStatus
    }
  });
}


