import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/auth";
import { hashPassword, passwordStrengthError, verifyPassword } from "../../../../../lib/password";
import { hashToken } from "../../../../../lib/tokens";
import { SESSION_COOKIE_NAME } from "../../../../../lib/session";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1)
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const strengthErr = passwordStrengthError(parsed.data.newPassword);
  if (strengthErr) {
    return NextResponse.json({ error: strengthErr }, { status: 400 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);

  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const currentHash = token ? hashToken(token) : null;

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    prisma.session.deleteMany({
      where: {
        userId: user.id,
        ...(currentHash ? { tokenHash: { not: currentHash } } : {})
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}

