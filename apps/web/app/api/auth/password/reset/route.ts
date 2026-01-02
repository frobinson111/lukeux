export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { hashToken } from "../../../../../lib/tokens";
import { hashPassword, passwordStrengthError } from "../../../../../lib/password";

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string(),
  passwordConfirmation: z.string()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { token, password, passwordConfirmation } = parsed.data;
  if (password !== passwordConfirmation) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const strengthError = passwordStrengthError(password);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now }
    }
  });

  if (!resetRecord) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  const newHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newHash }
    });

    await tx.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: now }
    });

    await tx.passwordReset.deleteMany({
      where: { userId: resetRecord.userId, usedAt: null }
    });

    await tx.session.deleteMany({ where: { userId: resetRecord.userId } });
  });

  return NextResponse.json({ message: "Password reset successful" });
}
