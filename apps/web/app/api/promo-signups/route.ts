import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { isPromoSignupsEnabled } from "../../../lib/feature-flags";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Allowed experience values
const VALID_EXPERIENCE = ["5-7", "8-10", "11-15", "15+"];

export async function POST(request: NextRequest) {
  try {
    // Check if promo signups are enabled
    const enabled = await isPromoSignupsEnabled();
    if (!enabled) {
      return NextResponse.json(
        { error: "Promo signups are currently closed" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, yearsExperience } = body;

    // Validation
    const errors: string[] = [];

    if (!firstName || typeof firstName !== "string" || firstName.trim().length < 2) {
      errors.push("First name must be at least 2 characters");
    }

    if (!lastName || typeof lastName !== "string" || lastName.trim().length < 2) {
      errors.push("Last name must be at least 2 characters");
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      errors.push("Valid email address is required");
    }

    if (!yearsExperience || !VALID_EXPERIENCE.includes(yearsExperience)) {
      errors.push("Years of experience must be one of: 5-7, 8-10, 11-15, 15+");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // Check for existing signup with this email
    const existingSignup = await prisma.promoSignup.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingSignup) {
      return NextResponse.json(
        { error: "This email has already been registered for the promotion" },
        { status: 409 }
      );
    }

    // Create the promo signup
    const signup = await prisma.promoSignup.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        yearsExperience,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Successfully registered for the promotion!",
        id: signup.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Promo signup error:", error);
    return NextResponse.json(
      { error: "Failed to process signup" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if email already exists or if promo is enabled
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const check = searchParams.get("check");

    // Check if promo signups are enabled (for client-side gating)
    if (check === "enabled") {
      const enabled = await isPromoSignupsEnabled();
      return NextResponse.json({ enabled });
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      );
    }

    const existingSignup = await prisma.promoSignup.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    return NextResponse.json({
      exists: !!existingSignup,
    });
  } catch (error) {
    console.error("Promo signup check error:", error);
    return NextResponse.json(
      { error: "Failed to check signup status" },
      { status: 500 }
    );
  }
}
