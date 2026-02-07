export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { hashPassword, passwordStrengthError } from "../../../../lib/password";
import { generateToken } from "../../../../lib/tokens";
import { sendVerificationEmail, sendOtpEmail } from "../../../../lib/email";
import { isOtpEnabled } from "../../../../lib/feature-flags";
import { generateOtp, OTP_EXPIRY_MINUTES } from "../../../../lib/otp";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email(),
  password: z.string(),
  passwordConfirmation: z.string()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { firstName, lastName, email, password, passwordConfirmation } = parsed.data;
  if (password !== passwordConfirmation) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const strengthError = passwordStrengthError(password);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const otpEnabled = await isOtpEnabled();

  if (otpEnabled) {
    // OTP flow: create user + OTP verification record
    const otp = generateOtp();
    const verification = generateToken();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          passwordHash,
        },
      });

      await tx.emailVerification.create({
        data: {
          userId: user.id,
          tokenHash: verification.hash,
          otpHash: otp.hash,
          type: "OTP",
          expiresAt: otpExpiresAt,
        },
      });
    });

    const result = await sendOtpEmail(normalizedEmail, otp.otp);

    return NextResponse.json(
      {
        message: "Registered. Check your email for a verification code.",
        verificationType: "otp",
        email: normalizedEmail,
        devPreview: process.env.NODE_ENV === "development" ? result.preview : undefined,
      },
      { status: 201 }
    );
  } else {
    // No verification: create user as immediately verified
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Registered successfully. You can now log in.",
        verificationType: "none",
      },
      { status: 201 }
    );
  }
}
