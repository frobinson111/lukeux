export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { decryptToken } from "../../../../../lib/figma";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  try {
    const connection = await prisma.figmaConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection) {
      return NextResponse.json({ error: "Not connected to Figma" }, { status: 404 });
    }

    const accessToken = decryptToken(connection.accessToken);

    if (!projectId) {
      return NextResponse.json({ 
        files: [],
        message: "Please select a project to view files."
      });
    }

    // Fetch files for the specific project
    const projectFilesResponse = await fetch(`https://api.figma.com/v1/projects/${projectId}/files`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!projectFilesResponse.ok) {
      console.error("[figma-files] Failed to fetch project files");
      return NextResponse.json({ files: [] });
    }

    const projectFilesData = await projectFilesResponse.json();
    
    return NextResponse.json({ 
      files: projectFilesData.files || []
    });
  } catch (error) {
    console.error("[figma-files] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
