export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { getFeatureFlag, setFeatureFlag } from "../../../../lib/feature-flags";

const toggleSchema = z.object({
  enabled: z.boolean(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flag = await getFeatureFlag("email_otp_enabled");
  const smtpConfig = await prisma.smtpConfig.findFirst();

  return NextResponse.json({
    otpEnabled: flag?.enabled === true,
    smtpConfigured: !!smtpConfig,
    smtpVerified: smtpConfig?.isVerified === true,
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.enabled) {
    const smtpConfig = await prisma.smtpConfig.findFirst();
    if (!smtpConfig || !smtpConfig.isVerified) {
      return NextResponse.json(
        { error: "SMTP must be configured and verified before enabling OTP" },
        { status: 400 }
      );
    }
  }

  await setFeatureFlag("email_otp_enabled", { enabled: parsed.data.enabled });
  return NextResponse.json({ otpEnabled: parsed.data.enabled });
}
