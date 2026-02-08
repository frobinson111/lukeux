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

    if (!connection.figmaTeamId) {
      return NextResponse.json({ projects: [], needsTeamId: true });
    }

    const accessToken = decryptToken(connection.accessToken);
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
        error: "Could not load projects. This usually means the Figma token is missing the projects:read permission. Please reconnect Figma to update permissions, or use a direct file URL instead.",
        needsReconnect: true,
      });
    }

    return NextResponse.json({
      projects: [],
      error: `Figma API error (${teamProjectsResponse.status}). Try reconnecting Figma.`,
      needsReconnect: true,
    });
  } catch (error) {
    console.error("[figma-projects] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
