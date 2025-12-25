import { cookies } from "next/headers";
import { prisma } from "../lib/prisma";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE_NAME = "lukeux_session";
const SESSION_DAYS = 14;

export function buildSessionCookie(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  };
}

export async function createSession(userId: string) {
  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function revokeSessionByToken(rawToken: string | undefined) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE_NAME, token, buildSessionCookie(expiresAt));
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
