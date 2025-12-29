import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true, firstName: true, lastName: true } } }
    });
    return NextResponse.json({ feedback });
  } catch (err) {
    console.error("admin feedback error", err);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}

