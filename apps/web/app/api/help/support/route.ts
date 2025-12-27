import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(200),
  message: z.string().min(1).max(2000),
  phone: z.string().max(100).optional().nullable(),
  requestType: z.string().max(100).optional().nullable()
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.supportRequest.create({
    data: {
      userId: user.id,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName?.trim() || "",
      email: parsed.data.email.trim(),
      message: parsed.data.message.trim(),
      phone: parsed.data.phone?.trim() || null,
      requestType: parsed.data.requestType?.trim() || null
    }
  });

  return NextResponse.json({ ok: true });
}

