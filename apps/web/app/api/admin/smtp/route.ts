export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { encrypt } from "../../../../lib/crypto";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(), // Optional when updating (keeps existing password)
  encryption: z.enum(["NONE", "STARTTLS", "SSL_TLS"]),
  fromEmail: z.string().email("Invalid from email"),
  fromName: z.string().min(1, "From name is required"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.smtpConfig.findFirst();
  if (!config) {
    return NextResponse.json({ config: null });
  }

  return NextResponse.json({
    config: {
      id: config.id,
      host: config.host,
      port: config.port,
      username: config.username,
      passwordSet: true,
      encryption: config.encryption,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      isVerified: config.isVerified,
    },
  });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = smtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid SMTP configuration", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.smtpConfig.findFirst();

  // Password is required for new config, optional for updates
  if (!existing && !parsed.data.password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const encryptedPassword = parsed.data.password
    ? encrypt(parsed.data.password, "smtp-password-salt")
    : undefined;

  if (existing) {
    await prisma.smtpConfig.update({
      where: { id: existing.id },
      data: {
        host: parsed.data.host,
        port: parsed.data.port,
        username: parsed.data.username,
        ...(encryptedPassword ? { encryptedPassword } : {}),
        encryption: parsed.data.encryption,
        fromEmail: parsed.data.fromEmail,
        fromName: parsed.data.fromName,
        isVerified: false,
      },
    });
  } else {
    await prisma.smtpConfig.create({
      data: {
        host: parsed.data.host,
        port: parsed.data.port,
        username: parsed.data.username,
        encryptedPassword: encryptedPassword!,
        encryption: parsed.data.encryption,
        fromEmail: parsed.data.fromEmail,
        fromName: parsed.data.fromName,
      },
    });
  }

  return NextResponse.json({ message: "SMTP configuration saved" });
}
