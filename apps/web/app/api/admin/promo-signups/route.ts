import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate and require admin
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const status = searchParams.get("status");
    const experience = searchParams.get("experience");

    // Build where clause
    const where: any = {};
    if (status && ["PENDING", "ACTIVATED", "EXPIRED"].includes(status)) {
      where.status = status;
    }
    if (experience && ["5-7", "8-10", "11-15", "15+"].includes(experience)) {
      where.yearsExperience = experience;
    }

    // Get total count
    const total = await prisma.promoSignup.count({ where });

    // Get paginated signups
    const signups = await prisma.promoSignup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get summary stats
    const [totalSignups, pendingCount, activatedCount, expiredCount] = await Promise.all([
      prisma.promoSignup.count(),
      prisma.promoSignup.count({ where: { status: "PENDING" } }),
      prisma.promoSignup.count({ where: { status: "ACTIVATED" } }),
      prisma.promoSignup.count({ where: { status: "EXPIRED" } }),
    ]);

    // Get experience breakdown
    const experienceStats = await Promise.all([
      prisma.promoSignup.count({ where: { yearsExperience: "5-7" } }),
      prisma.promoSignup.count({ where: { yearsExperience: "8-10" } }),
      prisma.promoSignup.count({ where: { yearsExperience: "11-15" } }),
      prisma.promoSignup.count({ where: { yearsExperience: "15+" } }),
    ]);

    return NextResponse.json({
      signups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalSignups,
        pending: pendingCount,
        activated: activatedCount,
        expired: expiredCount,
        byExperience: {
          "5-7": experienceStats[0],
          "8-10": experienceStats[1],
          "11-15": experienceStats[2],
          "15+": experienceStats[3],
        },
      },
    });
  } catch (error) {
    console.error("Admin promo signups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo signups" },
      { status: 500 }
    );
  }
}
