export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.figmaConnection.findUnique({
    where: { userId: user.id },
    select: {
      figmaEmail: true,
      figmaHandle: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  const isExpired = connection.expiresAt && connection.expiresAt < new Date();

  return NextResponse.json({
    connected: !isExpired,
    email: connection.figmaEmail,
    handle: connection.figmaHandle,
    connectedAt: connection.createdAt,
    expiresAt: connection.expiresAt,
  });
}
