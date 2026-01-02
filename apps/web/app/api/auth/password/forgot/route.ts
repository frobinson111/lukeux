export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../../lib/prisma";
import { generateToken } from "../../../../../lib/tokens";
import { sendPasswordResetEmail } from "../../../../../lib/email";

const forgotSchema = z.object({ email: z.string().trim().email() });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const reset = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.passwordReset.deleteMany({ where: { userId: user.id } });
      await tx.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: reset.hash,
          expiresAt
        }
      });
    });

    const { preview } = await sendPasswordResetEmail(email, reset.token);

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ message: "Reset email sent", devPreview: preview });
    }
  }

  // Always respond success to prevent account enumeration.
  return NextResponse.json({ message: "If that email exists, a reset link was sent." });
}
