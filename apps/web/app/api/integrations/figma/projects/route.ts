export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { decryptToken, encryptToken, refreshFigmaToken } from "../../../../../lib/figma";

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

    if (!connection.figmaTeamId) {
      return NextResponse.json({ projects: [], needsTeamId: true });
    }

    // Decrypt access token — if decryption fails, try refreshing with the refresh token
    let accessToken: string;
    try {
      accessToken = decryptToken(connection.accessToken);
    } catch (decryptErr) {
      console.warn("[figma-projects] Failed to decrypt access token, attempting refresh...", decryptErr);

      // Try to refresh with the refresh token
      if (connection.refreshToken) {
        try {
          const refreshedRefreshToken = decryptToken(connection.refreshToken);
          const tokenData = await refreshFigmaToken(refreshedRefreshToken);
          accessToken = tokenData.access_token;

          // Update stored tokens
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
          console.log("[figma-projects] Token refreshed successfully");
        } catch (refreshErr) {
          console.error("[figma-projects] Token refresh also failed:", refreshErr);
          return NextResponse.json({
            projects: [],
            error: "Figma session expired. Please reconnect Figma.",
            needsReconnect: true,
          });
        }
      } else {
        return NextResponse.json({
          projects: [],
          error: "Figma session expired. Please reconnect Figma.",
          needsReconnect: true,
        });
      }
    }

    const teamId = connection.figmaTeamId;

    // Fetch projects for the configured team
    const projects: any[] = [];

    console.log(`[figma-projects] Fetching projects for team: ${teamId}`);

    const teamProjectsResponse = await fetch(`https://api.figma.com/v1/teams/${teamId}/projects`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    console.log(`[figma-projects] Team ${teamId} response:`, {
      status: teamProjectsResponse.status,
      ok: teamProjectsResponse.ok,
    });

    if (teamProjectsResponse.ok) {
      const teamProjectsData = await teamProjectsResponse.json();
      console.log(`[figma-projects] Team ${teamId} projects:`, {
        projectsCount: teamProjectsData.projects?.length || 0,
        projectNames: teamProjectsData.projects?.map((p: any) => p.name) || [],
      });

      for (const project of teamProjectsData.projects || []) {
        projects.push({
          id: project.id,
          name: project.name,
          teamId: teamId,
        });
      }

      console.log(`[figma-projects] Total projects found: ${projects.length}`);
      return NextResponse.json({ projects });
    }

    // Handle Figma API errors
    const errorText = await teamProjectsResponse.text();
    console.error(`[figma-projects] Team ${teamId} error:`, {
      status: teamProjectsResponse.status,
      error: errorText,
    });

    if (teamProjectsResponse.status === 401) {
      return NextResponse.json({
        projects: [],
        error: "Figma token is invalid or expired. Please reconnect Figma.",
        needsReconnect: true,
      });
    }

    if (teamProjectsResponse.status === 403) {
      return NextResponse.json({
        projects: [],
        error: "Cannot access this team. Please reconnect Figma to grant the required permissions, or check that the team ID is correct.",
        needsReconnect: true,
      });
    }

    if (teamProjectsResponse.status === 404) {
      return NextResponse.json({
        projects: [],
        error: "Project browsing is not available yet. Use a direct Figma file URL instead.",
        scopeLimited: true,
      });
    }

    return NextResponse.json({
      projects: [],
      error: `Figma API error (${teamProjectsResponse.status}). Try reconnecting Figma.`,
      needsReconnect: true,
    });
  } catch (error) {
    console.error("[figma-projects] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    // If this is a decryption/auth error, guide the user to reconnect
    if (message.includes("authenticate data") || message.includes("decrypt")) {
      return NextResponse.json({
        projects: [],
        error: "Figma session expired. Please reconnect Figma.",
        needsReconnect: true,
      });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
