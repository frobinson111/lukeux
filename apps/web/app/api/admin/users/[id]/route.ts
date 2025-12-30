import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { stripe } from "../../../../../lib/stripe";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireUser();
  if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPERUSER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUserId = params.id;

  if (!targetUserId) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  if (targetUserId === admin.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.deletedAt) {
    return NextResponse.json({ status: "already_deleted" });
  }

  // Attempt to cancel active Stripe subscriptions for this user.
  if (user.stripeCustomerId && stripe) {
    try {
      const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 100 });
      for (const sub of subs.data) {
        if (sub.status !== "canceled" && sub.status !== "incomplete_expired") {
          await stripe.subscriptions.cancel(sub.id, { cancel_at_period_end: true });
        }
      }
    } catch (err) {
      console.error("[admin][user-delete] failed to cancel stripe subscriptions", {
        userId: user.id,
        stripeCustomerId: user.stripeCustomerId,
        error: err
      });
    }
  }

  await prisma.session.deleteMany({ where: { userId: user.id } });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      deletedAt: new Date(),
      deletedById: admin.id,
      planStatus: "SUSPENDED"
    }
  });

  return NextResponse.json({ status: "deleted" });
}


