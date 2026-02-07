export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { hashToken } from "../../../../lib/tokens";
import { hashOtp, OTP_MAX_ATTEMPTS } from "../../../../lib/otp";

const verifyTokenSchema = z.object({ token: z.string().min(1) });
const verifyOtpSchema = z.object({
  otp: z.string().length(6),
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Try OTP verification first
  const otpParsed = verifyOtpSchema.safeParse(body);
  if (otpParsed.success) {
    return handleOtpVerification(otpParsed.data.otp, otpParsed.data.email);
  }

  // Fall back to token verification
  const tokenParsed = verifyTokenSchema.safeParse(body);
  if (tokenParsed.success) {
    return handleTokenVerification(tokenParsed.data.token);
  }

  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}

async function handleTokenVerification(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const verification = await prisma.emailVerification.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!verification) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: now },
    });

    await tx.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: now },
    });

    await tx.emailVerification.deleteMany({
      where: {
        userId: verification.userId,
        usedAt: null,
        id: { not: verification.id },
      },
    });
  });

  return NextResponse.json({ message: "Email verified" });
}

async function handleOtpVerification(otp: string, email: string) {
  const now = new Date();
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      type: "OTP",
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  if (verification.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Please request a new code." },
      { status: 429 }
    );
  }

  const otpHash = hashOtp(otp);
  if (otpHash !== verification.otpHash) {
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { attempts: { increment: 1 } },
    });

    const remaining = OTP_MAX_ATTEMPTS - verification.attempts - 1;
    return NextResponse.json(
      {
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many attempts. Please request a new code.",
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: now },
    });

    await tx.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: now },
    });

    await tx.emailVerification.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
        id: { not: verification.id },
      },
    });
  });

  return NextResponse.json({ message: "Email verified" });
}
