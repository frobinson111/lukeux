export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { generateToken } from "../../../../lib/tokens";
import { generateOtp, OTP_EXPIRY_MINUTES, OTP_RATE_LIMIT_PER_HOUR } from "../../../../lib/otp";
import { isOtpEnabled } from "../../../../lib/feature-flags";
import { sendVerificationEmail, sendOtpEmail } from "../../../../lib/email";

const resendSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt) {
    // Don't reveal whether the email exists
    return NextResponse.json({ message: "If the email exists, a verification code has been sent." });
  }

  // Rate limit: max per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.emailVerification.count({
    where: { userId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount >= OTP_RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Invalidate existing unused verifications
  await prisma.emailVerification.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const otpEnabled = await isOtpEnabled();
  if (otpEnabled) {
    const { otp, hash: otpHash } = generateOtp();
    const verification = generateToken();
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash: verification.hash,
        otpHash,
        type: "OTP",
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });
    const result = await sendOtpEmail(email, otp);
    return NextResponse.json({
      message: "Verification code sent.",
      verificationType: "otp",
      devPreview: process.env.NODE_ENV === "development" ? result.preview : undefined,
    });
  } else {
    const verification = generateToken();
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash: verification.hash,
        type: "LINK",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const result = await sendVerificationEmail(email, verification.token);
    return NextResponse.json({
      message: "Verification email sent.",
      verificationType: "link",
      devPreview: process.env.NODE_ENV === "development" ? result.preview : undefined,
    });
  }
}
