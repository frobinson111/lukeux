import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { hashToken } from "./tokens";
import { SESSION_COOKIE_NAME, clearSessionCookie } from "./session";

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: now },
      revokedAt: null
    },
    include: {
      user: true
    }
  });

  if (!session) {
    // Clear invalid/expired cookies to reduce confusion.
    clearSessionCookie();
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.emailVerifiedAt) return null;
  if (user.planStatus === "SUSPENDED") return null;
  return user;
}
