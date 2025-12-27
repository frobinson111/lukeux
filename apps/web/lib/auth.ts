import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { hashToken } from "./tokens";
import { SESSION_COOKIE_NAME } from "./session";

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    console.info("[auth] no session cookie");
    return null;
  }
  const tokenHash = hashToken(token);
  const now = new Date();
  console.info("[auth] token present", {
    tokenPreview: token.slice(0, 6),
    tokenLength: token.length,
    tokenHashPreview: tokenHash.slice(0, 8)
  });

  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: now },
      revokedAt: null
    }
  });

  if (!session) {
    console.info("[auth] no active session for token hash");
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    console.info("[auth] session user not found", { userId: session.userId });
    return null;
  }

  console.info("[auth] user authenticated", { userId: user.id, role: user.role, plan: user.plan });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.emailVerifiedAt) return null;
  if (user.planStatus === "SUSPENDED") return null;
  return user;
}
