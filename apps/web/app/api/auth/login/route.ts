export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../../lib/prisma";
import { verifyPassword } from "../../../../lib/password";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookie,
  clearSessionCookie,
  createSession,
  revokeSessionByToken
} from "../../../../lib/session";
import { cookies } from "next/headers";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string()
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.deletedAt) {
    return NextResponse.json({ error: "Account is deleted" }, { status: 403 });
  }

  if (user.planStatus === "SUSPENDED") {
    return NextResponse.json({ error: "Account is suspended" }, { status: 403 });
  }

  // Revoke any existing session cookie value
  const existingToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  await revokeSessionByToken(existingToken);
  clearSessionCookie();

  const { token, expiresAt } = await createSession(user.id);

  const res = NextResponse.json({ message: "Logged in" });
  res.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookie(expiresAt));
  return res;
}
