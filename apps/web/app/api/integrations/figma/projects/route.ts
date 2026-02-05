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
    
    console.log("[figma-projects] User data:", {
      hasTeams: !!userData.teams,
      teamsCount: userData.teams?.length || 0,
      teamNames: userData.teams?.map((t: any) => t.name) || [],
    });
    
    // Fetch projects for each team
    const projects: any[] = [];
    
    // Get team projects
    for (const team of userData.teams || []) {
      try {
        console.log(`[figma-projects] Fetching projects for team: ${team.name} (${team.id})`);
        
        const teamProjectsResponse = await fetch(`https://api.figma.com/v1/teams/${team.id}/projects`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        
        console.log(`[figma-projects] Team ${team.name} response:`, {
          status: teamProjectsResponse.status,
          ok: teamProjectsResponse.ok,
        });
        
        if (teamProjectsResponse.ok) {
          const teamProjectsData = await teamProjectsResponse.json();
          console.log(`[figma-projects] Team ${team.name} projects:`, {
            projectsCount: teamProjectsData.projects?.length || 0,
            projectNames: teamProjectsData.projects?.map((p: any) => p.name) || [],
          });
          
          for (const project of teamProjectsData.projects || []) {
            projects.push({
              id: project.id,
              name: project.name,
              teamId: team.id,
              teamName: team.name,
            });
          }
        } else {
          const errorText = await teamProjectsResponse.text();
          console.error(`[figma-projects] Team ${team.name} error:`, {
            status: teamProjectsResponse.status,
            error: errorText,
          });
        }
      } catch (err) {
        console.error(`[figma-projects] Failed to fetch projects for team ${team.id}:`, err);
      }
    }
    
    console.log(`[figma-projects] Total projects found: ${projects.length}`);
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[figma-projects] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
