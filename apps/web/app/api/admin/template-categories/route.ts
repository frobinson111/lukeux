import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(128)
});

export async function GET() {
  const categories = await prisma.templateCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.templateCategory.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 400 });
  }

  const created = await prisma.templateCategory.create({
    data: { name }
  });

  return NextResponse.json({ category: created });
}


