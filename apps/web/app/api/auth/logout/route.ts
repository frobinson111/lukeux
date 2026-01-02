export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  revokeSessionByToken
} from "../../../../lib/session";

export async function POST() {
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  await revokeSessionByToken(sessionToken);
  clearSessionCookie();
  return NextResponse.json({ message: "Logged out" });
}
