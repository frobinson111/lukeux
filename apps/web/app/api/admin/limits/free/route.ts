import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

const schema = z.object({
  dailyLimit: z.number().int().min(0).max(100000)
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

  const { dailyLimit } = parsed.data;

  const upserted = await prisma.planConfig.upsert({
    where: { plan: "FREE" },
    update: { dailyLimit },
    create: { plan: "FREE", dailyLimit }
  });

  return NextResponse.json({ plan: upserted.plan, dailyLimit: upserted.dailyLimit });
}


