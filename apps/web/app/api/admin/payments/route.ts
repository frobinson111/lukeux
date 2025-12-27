import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  pricePro: z.string().min(1).optional()
});

function maskSecret(secret?: string | null) {
  if (!secret) return "";
  const visible = secret.slice(-4);
  return `${secret.slice(0, 2)}••••${visible}`;
}

export async function GET() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cfg = await prisma.paymentConfig.findFirst();
  const secret = process.env.STRIPE_SECRET_KEY || "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET || "";
  const mode = secret.startsWith("sk_live") ? "live" : secret.startsWith("sk_test") ? "test" : "unknown";

  return NextResponse.json({
    mode,
    pricePro: cfg?.pricePro ?? null,
    secretMasked: maskSecret(secret),
    webhookMasked: maskSecret(webhook)
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const pricePro = parsed.data.pricePro;

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.paymentConfig.findFirst();
    if (existing) {
      return tx.paymentConfig.update({
        where: { id: existing.id },
        data: { pricePro: pricePro ?? existing.pricePro }
      });
    }
    return tx.paymentConfig.create({
      data: { pricePro: pricePro ?? null }
    });
  });

  const secret = process.env.STRIPE_SECRET_KEY || "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET || "";
  const mode = secret.startsWith("sk_live") ? "live" : secret.startsWith("sk_test") ? "test" : "unknown";

  return NextResponse.json({
    mode,
    pricePro: updated.pricePro ?? null,
    secretMasked: maskSecret(secret),
    webhookMasked: maskSecret(webhook)
  });
}


