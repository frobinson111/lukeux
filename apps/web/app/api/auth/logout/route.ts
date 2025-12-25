import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, clearSessionCookie, revokeSessionByToken } from "../../../../lib/session";

async function logoutAndRedirect() {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  await revokeSessionByToken(sessionToken);
  clearSessionCookie();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
    status: 303
  });
}

export async function POST() {
  return logoutAndRedirect();
}

export async function GET() {
  return logoutAndRedirect();
}
