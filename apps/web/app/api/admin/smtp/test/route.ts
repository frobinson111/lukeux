export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { sendTestEmail } from "../../../../../lib/email";

const testSchema = z.object({
  to: z.string().email(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const result = await sendTestEmail(parsed.data.to);
  if (!result.sent) {
    return NextResponse.json(
      { error: result.error || "Failed to send test email" },
      { status: 500 }
    );
  }

  const config = await prisma.smtpConfig.findFirst();
  if (config) {
    await prisma.smtpConfig.update({
      where: { id: config.id },
      data: { isVerified: true },
    });
  }

  return NextResponse.json({ message: "Test email sent successfully" });
}
