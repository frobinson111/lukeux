export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

const schema = z.object({
  type: z.enum(["LIKE", "DISLIKE", "SUGGESTION"]),
  message: z.string().min(5).max(1000),
  source: z.string().optional(),
  triggerCount: z.number().optional(),
  taskId: z.string().optional()
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  try {
    await prisma.feedback.create({
      data: {
        userId: user.id,
        type: data.type,
        message: data.message,
        source: data.source ?? "unknown",
        triggerCount: data.triggerCount,
        taskId: data.taskId
      }
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("feedback create error", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

