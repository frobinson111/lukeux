export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET - Public endpoint to fetch active playbook items for the homepage
export async function GET() {
  try {
    const [items, config] = await Promise.all([
      prisma.playbookItem.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          audioUrl: true,
          videoUrl: true,
          documentUrl: true,
          showAudio: true,
          showVideo: true,
          showDocument: true,
          sortOrder: true,
        },
      }),
      prisma.playbookConfig.findFirst(),
    ]);

    return NextResponse.json({
      items,
      visibleCount: config?.visibleCount ?? 3,
    });
  } catch (error) {
    console.error("Error fetching public playbook items:", error);
    return NextResponse.json({ items: [], visibleCount: 3 });
  }
}
