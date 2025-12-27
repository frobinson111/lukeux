import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";
import { z } from "zod";

const allowedProviders = ["openai", "anthropic", "local"];

const createSchema = z.object({
  provider: z.string().refine((v) => allowedProviders.includes(v), "Unsupported provider"),
  displayName: z.string().min(1),
  key: z.string().min(8),
  isActive: z.boolean().optional().default(true)
});

export async function GET() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" }
  });

  const redacted = keys.map((k) => ({
    id: k.id,
    provider: k.provider,
    displayName: k.displayName,
    last4: k.key.slice(-4),
    isActive: k.isActive,
    createdAt: k.createdAt
  }));

  return NextResponse.json({ keys: redacted });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const created = await prisma.apiKey.create({
    data: {
      provider: parsed.data.provider,
      displayName: parsed.data.displayName,
      key: parsed.data.key,
      isActive: parsed.data.isActive,
      createdById: user.id
    }
  });

  return NextResponse.json({
    key: {
      id: created.id,
      provider: created.provider,
      displayName: created.displayName,
      last4: created.key.slice(-4),
      isActive: created.isActive,
      createdAt: created.createdAt
    }
  });
}


