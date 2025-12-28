import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { generateToken } from "../../../../lib/tokens";
import { sendVerificationEmail } from "../../../../lib/email";

const resendSchema = z.object({
  email: z.string().trim().email()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.emailVerifiedAt) {
    // Avoid user enumeration; always return generic success.
    return NextResponse.json({ message: "If the account is unverified, we sent a verification email." });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // Remove prior unused tokens for this user.
    await tx.emailVerification.deleteMany({
      where: {
        userId: user.id,
        usedAt: null
      }
    });

    await tx.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash: token.hash,
        expiresAt
      }
    });
  });

  await sendVerificationEmail(normalizedEmail, token.token);

  return NextResponse.json({ message: "If the account is unverified, we sent a verification email." });
}

