export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { hashPassword, passwordStrengthError } from "../../../../lib/password";
import { generateToken } from "../../../../lib/tokens";
import { sendVerificationEmail } from "../../../../lib/email";

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
  const verification = generateToken();
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        passwordHash
      }
    });

    await tx.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash: verification.hash,
        expiresAt: verificationExpiresAt
      }
    });
  });

  const { preview } = await sendVerificationEmail(normalizedEmail, verification.token);

  return NextResponse.json(
    {
      message: "Registered. Check email for verification link.",
      devPreview: process.env.NODE_ENV === "development" ? preview : undefined
    },
    { status: 201 }
  );
}
