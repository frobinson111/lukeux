export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireUser } from "../../../../../lib/auth";
import { buildFigmaAuthUrl } from "../../../../../lib/figma";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = randomUUID();
    const url = buildFigmaAuthUrl(state);

    console.log("[figma-connect] Setting state cookie:", {
      state,
      userId: user.id,
      redirectUrl: url,
      isProduction: process.env.NODE_ENV === "production",
    });

    const res = NextResponse.redirect(url);
    res.cookies.set("figma_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60, // 10 minutes
      domain: undefined, // Let browser determine domain
    });

    return res;
  } catch (error) {
    console.error("[figma-connect] error:", error);
    return NextResponse.json({ error: "Figma OAuth not configured" }, { status: 500 });
  }
}
