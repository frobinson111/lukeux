import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getCurrentUser } from "../../../../lib/auth";

// POST - Create or update recommendation feedback
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { historyEntryId, recommendationNum, feedback, templateId, templateTitle } = body;

    // Validate required fields
    if (!historyEntryId || typeof recommendationNum !== "number") {
      return NextResponse.json(
        { error: "historyEntryId and recommendationNum are required" },
        { status: 400 }
      );
    }

    // Validate feedback value
    if (feedback !== null && feedback !== "UP" && feedback !== "DOWN") {
      return NextResponse.json(
        { error: "feedback must be 'UP', 'DOWN', or null" },
        { status: 400 }
      );
    }

    // Verify the history entry belongs to this user
    const historyEntry = await prisma.historyEntry.findFirst({
      where: {
        id: historyEntryId,
        userId: user.id
      }
    });

    if (!historyEntry) {
      return NextResponse.json(
        { error: "History entry not found or access denied" },
        { status: 404 }
      );
    }

    // If feedback is null, delete the existing feedback
    if (feedback === null) {
      await prisma.recommendationFeedback.deleteMany({
        where: {
          userId: user.id,
          historyEntryId,
          recommendationNum
        }
      });

      return NextResponse.json({ success: true, deleted: true });
    }

    // Upsert the feedback
    const result = await prisma.recommendationFeedback.upsert({
      where: {
        userId_historyEntryId_recommendationNum: {
          userId: user.id,
          historyEntryId,
          recommendationNum
        }
      },
      update: {
        feedback,
        templateId: templateId || null,
        templateTitle: templateTitle || null,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        historyEntryId,
        recommendationNum,
        feedback,
        templateId: templateId || null,
        templateTitle: templateTitle || null
      }
    });

    return NextResponse.json({ success: true, feedback: result });
  } catch (error) {
    console.error("Error saving recommendation feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}

// GET - Retrieve feedbacks for a history entry
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const historyEntryId = searchParams.get("historyEntryId");

    if (!historyEntryId) {
      return NextResponse.json(
        { error: "historyEntryId is required" },
        { status: 400 }
      );
    }

    // Verify the history entry belongs to this user
    const historyEntry = await prisma.historyEntry.findFirst({
      where: {
        id: historyEntryId,
        userId: user.id
      }
    });

    if (!historyEntry) {
      return NextResponse.json(
        { error: "History entry not found or access denied" },
        { status: 404 }
      );
    }

    const feedbacks = await prisma.recommendationFeedback.findMany({
      where: {
        historyEntryId,
        userId: user.id
      },
      select: {
        recommendationNum: true,
        feedback: true
      }
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error("Error retrieving recommendation feedbacks:", error);
    return NextResponse.json(
      { error: "Failed to retrieve feedbacks" },
      { status: 500 }
    );
  }
}
