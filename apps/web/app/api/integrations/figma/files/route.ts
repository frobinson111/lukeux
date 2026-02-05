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

    // Fetch user's recent files from Figma
    const response = await fetch("https://api.figma.com/v1/me/files", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[figma-files] Failed to fetch files", {
        status: response.status,
        body: text,
      });
      return NextResponse.json({ error: "Failed to fetch Figma files" }, { status: response.status });
    }

    const data = await response.json();
    
    // The API returns {files: [...]} - let's reorganize by project/team
    return NextResponse.json(data);
  } catch (error) {
    console.error("[figma-files] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
