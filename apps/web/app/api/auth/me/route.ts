import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    plan: user.plan,
    planStatus: user.planStatus,
    emailVerified: !!user.emailVerifiedAt
  });
}
