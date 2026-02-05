export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { decryptToken } from "../../../../../lib/figma";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connection = await prisma.figmaConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection) {
      return NextResponse.json({ error: "Not connected to Figma" }, { status: 404 });
    }

    const accessToken = decryptToken(connection.accessToken);

    // First, get user info to find their team
    const userResponse = await fetch("https://api.figma.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error("[figma-files] Failed to fetch user info");
      return NextResponse.json({ files: [] });
    }

    const userData = await userResponse.json();
    
    // Fetch team projects - Figma doesn't have a direct "my files" endpoint
    // Instead, we'll need to list projects from the user's teams
    // For now, return a message that files will be available soon
    // The user can paste Figma URLs into the main input instead
    
    return NextResponse.json({ 
      files: [],
      message: "To analyze Figma files, paste the Figma file URL into the main input above.",
      userId: userData.id,
      email: userData.email 
    });
  } catch (error) {
    console.error("[figma-files] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
