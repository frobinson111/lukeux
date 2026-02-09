export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, plan } = body;

    if (!userId || !plan) {
      return NextResponse.json({ error: "userId and plan are required" }, { status: 400 });
    }

    if (plan !== "FREE" && plan !== "PRO") {
      return NextResponse.json({ error: "Invalid plan. Must be FREE or PRO" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.deletedAt) {
      return NextResponse.json({ error: "Cannot update deleted user" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planStatus: "ACTIVE"
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        plan: updatedUser.plan,
        planStatus: updatedUser.planStatus
      }
    });
  } catch (error) {
    console.error("[admin][users][plan] Error updating user plan:", error);
    return NextResponse.json({ error: "Failed to update user plan" }, { status: 500 });
  }
}

