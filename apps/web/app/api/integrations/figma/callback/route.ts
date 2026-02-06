export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import {
  exchangeFigmaCode,
  getFigmaUser,
  encryptToken,
} from "../../../../../lib/figma";

function abs(req: Request, path: string) {
  const url = new URL(req.url);
  return `${url.origin}${path}`;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(abs(req, "/auth/login"));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[figma-callback] OAuth error:", error);
    return NextResponse.redirect(abs(req, "/app/canvas?figma_error=oauth_denied"));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("figma_oauth_state")?.value;
  
  console.log("[figma-callback] Debug info:", {
    receivedState: state,
    expectedState,
    hasCode: !!code,
    allCookies: Array.from(cookieStore.getAll()).map(c => c.name),
  });
  
  if (!code || !state || !expectedState || state !== expectedState) {
    console.error("[figma-callback] state mismatch", {
      code: !!code,
      state: !!state,
      expectedState: !!expectedState,
      match: state === expectedState
    });
    return NextResponse.redirect(abs(req, "/app/canvas?figma_error=oauth_state"));
  }

  try {
    const tokens = await exchangeFigmaCode(code);
    const figmaUser = await getFigmaUser(tokens.access_token);

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await prisma.figmaConnection.upsert({
      where: { userId: user.id },
      update: {
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiresAt,
        figmaUserId: figmaUser.id,
        figmaEmail: figmaUser.email,
        figmaHandle: figmaUser.handle,
      },
      create: {
        userId: user.id,
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiresAt,
        figmaUserId: figmaUser.id,
        figmaEmail: figmaUser.email,
        figmaHandle: figmaUser.handle,
      },
    });

    const res = NextResponse.redirect(abs(req, "/app/canvas?figma_connected=true&figma_setup=team"));
    res.cookies.delete("figma_oauth_state");
    return res;
  } catch (err) {
    console.error("[figma-callback] error:", err);
    return NextResponse.redirect(abs(req, "/app/canvas?figma_error=oauth_failed"));
  }
}
