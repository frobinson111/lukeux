import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/auth";
import { hashToken } from "../../../../../lib/tokens";
import { SESSION_COOKIE_NAME } from "../../../../../lib/session";

export async function POST() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const currentHash = token ? hashToken(token) : null;

  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      ...(currentHash ? { tokenHash: { not: currentHash } } : {})
    }
  });

  return NextResponse.json({ ok: true });
}

