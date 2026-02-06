export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teamId } = await req.json();

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    // Validate that the team ID looks reasonable (numeric string)
    const cleanTeamId = teamId.trim();
    if (!/^\d+$/.test(cleanTeamId)) {
      return NextResponse.json(
        { error: "Invalid team ID. It should be a numeric value from your Figma team URL." },
        { status: 400 }
      );
    }

    const connection = await prisma.figmaConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection) {
      return NextResponse.json({ error: "Not connected to Figma" }, { status: 404 });
    }

    await prisma.figmaConnection.update({
      where: { userId: user.id },
      data: { figmaTeamId: cleanTeamId },
    });

    return NextResponse.json({ success: true, teamId: cleanTeamId });
  } catch (error) {
    console.error("[figma-team] Error:", error);
    return NextResponse.json({ error: "Failed to save team ID" }, { status: 500 });
  }
}
