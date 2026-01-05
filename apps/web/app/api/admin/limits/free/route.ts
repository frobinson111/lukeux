export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const limit = typeof body?.limit === "number" ? body.limit : null;
  if (limit === null) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }

  return NextResponse.json({ success: true, limit });
}

