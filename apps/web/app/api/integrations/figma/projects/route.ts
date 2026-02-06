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

    try {
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
      } else {
        const errorText = await teamProjectsResponse.text();
        console.error(`[figma-projects] Team ${teamId} error:`, {
          status: teamProjectsResponse.status,
          error: errorText,
        });
        if (teamProjectsResponse.status === 403) {
          return NextResponse.json({
            projects: [],
            error: "Cannot access this team. Make sure you have permission and the team ID is correct.",
          });
        }
      }
    } catch (err) {
      console.error(`[figma-projects] Failed to fetch projects for team ${teamId}:`, err);
    }

    console.log(`[figma-projects] Total projects found: ${projects.length}`);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[figma-projects] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
