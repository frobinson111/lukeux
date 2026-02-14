export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { decryptToken, encryptToken, refreshFigmaToken } from "../../../../../lib/figma";

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

    let accessToken: string;
    try {
      accessToken = decryptToken(connection.accessToken);
    } catch (decryptErr) {
      console.warn("[figma-files] Failed to decrypt access token, attempting refresh...");
      if (connection.refreshToken) {
        try {
          const refreshedRefreshToken = decryptToken(connection.refreshToken);
          const tokenData = await refreshFigmaToken(refreshedRefreshToken);
          accessToken = tokenData.access_token;

          const updateData: Record<string, any> = {
            accessToken: encryptToken(tokenData.access_token),
          };
          if (tokenData.refresh_token) {
            updateData.refreshToken = encryptToken(tokenData.refresh_token);
          }
          if (tokenData.expires_in) {
            updateData.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          }
          await prisma.figmaConnection.update({
            where: { userId: user.id },
            data: updateData,
          });
        } catch (refreshErr) {
          console.error("[figma-files] Token refresh failed:", refreshErr);
          return NextResponse.json({
            files: [],
            error: "Figma session expired. Please reconnect Figma.",
            needsReconnect: true,
          });
        }
      } else {
        return NextResponse.json({
          files: [],
          error: "Figma session expired. Please reconnect Figma.",
          needsReconnect: true,
        });
      }
    }

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
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("authenticate data") || message.includes("decrypt")) {
      return NextResponse.json({
        files: [],
        error: "Figma session expired. Please reconnect Figma.",
        needsReconnect: true,
      });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
