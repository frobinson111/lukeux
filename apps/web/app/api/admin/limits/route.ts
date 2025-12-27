import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  generationLimit: z.number().int().min(0).nullable()
});

export async function POST(req: Request) {
  const admin = await requireUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "ADMIN" && admin.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, generationLimit } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { email },
    data: { generationLimit },
    select: { id: true, email: true, generationLimit: true, role: true }
  });

  return NextResponse.json({ user: updated });
}



