export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { hashToken } from "../../../../lib/tokens";

const verifySchema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { token } = parsed.data;
  const tokenHash = hashToken(token);
  const now = new Date();

  const verification = await prisma.emailVerification.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now }
    }
  });

  if (!verification) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: now }
    });

    await tx.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: now }
    });

    await tx.emailVerification.deleteMany({
      where: {
        userId: verification.userId,
        usedAt: null,
        id: { not: verification.id }
      }
    });
  });

  return NextResponse.json({ message: "Email verified" });
}
