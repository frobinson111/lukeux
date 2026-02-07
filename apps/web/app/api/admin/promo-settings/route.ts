export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { getFeatureFlag, setFeatureFlag } from "../../../../lib/feature-flags";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flag = await getFeatureFlag("promo_signups_enabled");
  return NextResponse.json({
    promoEnabled: flag === null ? true : flag?.enabled === true,
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await setFeatureFlag("promo_signups_enabled", { enabled: body.enabled });
  return NextResponse.json({ promoEnabled: body.enabled });
}
