import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get all recommendation feedbacks with user and history entry info
    const feedbacks = await prisma.recommendationFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        User: { select: { email: true, firstName: true, lastName: true } },
        HistoryEntry: { select: { title: true, templateIndex: true } }
      }
    });

    // Calculate summary stats
    const totalUp = feedbacks.filter(f => f.feedback === "UP").length;
    const totalDown = feedbacks.filter(f => f.feedback === "DOWN").length;

    // Group by template for analytics
    const templateStats: Record<string, { title: string; up: number; down: number }> = {};
    for (const fb of feedbacks) {
      const key = fb.templateTitle || "Unknown Template";
      if (!templateStats[key]) {
        templateStats[key] = { title: key, up: 0, down: 0 };
      }
      if (fb.feedback === "UP") {
        templateStats[key].up++;
      } else if (fb.feedback === "DOWN") {
        templateStats[key].down++;
      }
    }

    // Convert to sorted array (worst performing first)
    const templateStatsArray = Object.values(templateStats)
      .map(t => ({
        ...t,
        total: t.up + t.down,
        ratio: t.up + t.down > 0 ? t.up / (t.up + t.down) : 0
      }))
      .sort((a, b) => a.ratio - b.ratio);

    return NextResponse.json({
      feedbacks: feedbacks.map(f => ({
        id: f.id,
        userEmail: f.User?.email || null,
        userName: f.User ? `${f.User.firstName} ${f.User.lastName}` : null,
        historyTitle: f.HistoryEntry?.title || null,
        recommendationNum: f.recommendationNum,
        feedback: f.feedback,
        templateId: f.templateId,
        templateTitle: f.templateTitle,
        createdAt: f.createdAt
      })),
      summary: {
        totalUp,
        totalDown,
        total: totalUp + totalDown,
        ratio: totalUp + totalDown > 0 ? totalUp / (totalUp + totalDown) : 0
      },
      templateStats: templateStatsArray
    });
  } catch (err) {
    console.error("admin recommendation feedback error", err);
    return NextResponse.json({ error: "Failed to load recommendation feedback" }, { status: 500 });
  }
}
