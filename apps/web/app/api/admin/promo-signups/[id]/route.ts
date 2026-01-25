import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    
    const signup = await prisma.promoSignup.findUnique({
      where: { id },
    });

    if (!signup) {
      return NextResponse.json({ error: "Signup not found" }, { status: 404 });
    }

    return NextResponse.json({ signup });
  } catch (error) {
    console.error("Get promo signup error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signup" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !["PENDING", "ACTIVATED", "EXPIRED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be PENDING, ACTIVATED, or EXPIRED" },
        { status: 400 }
      );
    }

    // Check if signup exists
    const existing = await prisma.promoSignup.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Signup not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = { status };

    // If activating, set activation and expiration dates
    if (status === "ACTIVATED" && existing.status !== "ACTIVATED") {
      updateData.activatedAt = new Date();
      // Set expiration to 3 months from now
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      updateData.expiresAt = expiresAt;
    }

    // If expiring, clear expiration date
    if (status === "EXPIRED") {
      updateData.expiresAt = new Date();
    }

    const signup = await prisma.promoSignup.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ signup });
  } catch (error) {
    console.error("Update promo signup error:", error);
    return NextResponse.json(
      { error: "Failed to update signup" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if signup exists
    const existing = await prisma.promoSignup.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Signup not found" }, { status: 404 });
    }

    await prisma.promoSignup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete promo signup error:", error);
    return NextResponse.json(
      { error: "Failed to delete signup" },
      { status: 500 }
    );
  }
}
