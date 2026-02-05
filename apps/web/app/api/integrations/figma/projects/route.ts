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

    // Get user's teams
    const userResponse = await fetch("https://api.figma.com/v1/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error("[figma-projects] Failed to fetch user info");
      return NextResponse.json({ projects: [] });
    }

    const userData = await userResponse.json();
    
    // Fetch projects for each team
    const projects: any[] = [];
    
    // Get team projects
    for (const team of userData.teams || []) {
      try {
        const teamProjectsResponse = await fetch(`https://api.figma.com/v1/teams/${team.id}/projects`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        
        if (teamProjectsResponse.ok) {
          const teamProjectsData = await teamProjectsResponse.json();
          for (const project of teamProjectsData.projects || []) {
            projects.push({
              id: project.id,
              name: project.name,
              teamId: team.id,
              teamName: team.name,
            });
          }
        }
      } catch (err) {
        console.error(`[figma-projects] Failed to fetch projects for team ${team.id}:`, err);
      }
    }
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[figma-projects] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
