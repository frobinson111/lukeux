import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { createSession, buildSessionCookie, SESSION_COOKIE_NAME } from "../../../../../lib/session";

type IdToken = {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
};

function decodeIdToken(token: string): IdToken {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid ID token");
  const payload = parts[1];
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json);
}

function abs(req: Request, path: string) {
  const url = new URL(req.url);
  return `${url.origin}${path}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const expectedState = cookies().get("oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(abs(req, "/?error=oauth_state"));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(abs(req, "/?error=oauth_config"));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(abs(req, "/?error=oauth_token"));
    }

    const tokens = await tokenRes.json();
    const idToken = tokens.id_token as string | undefined;
    if (!idToken) {
      return NextResponse.redirect(abs(req, "/?error=oauth_token_missing"));
    }

    const decoded = decodeIdToken(idToken);
    if (!decoded.sub || !decoded.aud || decoded.aud !== clientId) {
      return NextResponse.redirect(abs(req, "/?error=oauth_id_token"));
    }
    if (decoded.exp * 1000 < Date.now()) {
      return NextResponse.redirect(abs(req, "/?error=oauth_id_token_expired"));
    }

    const email = decoded.email?.toLowerCase() || null;
    const sub = decoded.sub;
    const now = new Date();

    // Link or create user
    let user = null;
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email ?? "" },
          { oauthAccounts: { some: { provider: "google", providerAccountId: sub } } }
        ],
        deletedAt: null
      }
    });

    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            firstName: decoded.given_name || "Google",
            lastName: decoded.family_name || "User",
            email: email || `google-${sub}@placeholder.local`,
            passwordHash: "oauth", // placeholder; not used for OAuth
            emailVerifiedAt: decoded.email_verified ? now : null,
            oauthAccounts: {
              create: {
                provider: "google",
                providerAccountId: sub,
                email: email ?? undefined
              }
            }
          }
        });
      } catch (createErr: any) {
        // Handle unique constraint violation (email already exists)
        if (createErr?.code === "P2002") {
          user = await prisma.user.findFirst({
            where: { email: email ?? "", deletedAt: null }
          });
          if (!user) {
            return NextResponse.redirect(abs(req, "/?error=oauth_failed"));
          }
        } else {
          throw createErr;
        }
      }
    }

    if (user) {
      // Ensure OAuth account link exists
      const existingLink = await prisma.oAuthAccount.findFirst({
        where: { provider: "google", providerAccountId: sub, userId: user.id }
      });
      if (!existingLink) {
        await prisma.oAuthAccount.create({
          data: {
            provider: "google",
            providerAccountId: sub,
            email: email ?? undefined,
            userId: user.id
          }
        });
      }
      // Update emailVerifiedAt if verified and missing
      if (decoded.email_verified && !user.emailVerifiedAt) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: now }
        });
      }
    }

    // Block suspended/deleted or missing user
    if (!user || user.planStatus === "SUSPENDED" || user.deletedAt) {
      return NextResponse.redirect(abs(req, "/?error=account_suspended"));
    }

    const { token, expiresAt } = await createSession(user.id);
    const res = NextResponse.redirect(abs(req, "/app/canvas"));
    res.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookie(expiresAt));
    res.cookies.delete("oauth_state");
    return res;
  } catch (err) {
    return NextResponse.redirect(abs(req, "/?error=oauth_failed"));
  }
}


