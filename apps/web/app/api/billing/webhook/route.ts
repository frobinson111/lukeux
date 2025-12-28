import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/prisma";
import { stripe } from "../../../../lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function getUserIdFromSubscription(sub: Stripe.Subscription) {
  if (sub.metadata?.userId) return sub.metadata.userId;
  if (sub.customer) {
    const customerId = sub.customer.toString();
    const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } });
    return user?.id;
  }
  return undefined;
}

async function getUserIdFromSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.userId) return session.metadata.userId;
  if (session.customer) {
    const customerId = session.customer.toString();
    const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } });
    return user?.id;
  }
  return undefined;
}

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    console.log("[webhook] event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer?.toString();
        const userId = await getUserIdFromSession(session);
        console.log("[webhook] checkout.session.completed", { userId, customerId, sessionId: session.id });

        if (userId && customerId) {
          const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              plan: "PRO",
              planStatus: "ACTIVE"
            }
          });
          console.log("[webhook] user upgraded to PRO", { id: updatedUser.id, plan: updatedUser.plan });
        } else {
          console.warn("[webhook] skipped upgrade - missing userId or customerId", { userId, customerId });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;
        const userId = await getUserIdFromSubscription(subscription);
        console.log("[webhook] subscription event", { userId, customer: subscription.customer?.toString(), status });

        if (userId) {
          const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "PRO",
              planStatus: status === "active" ? "ACTIVE" : "PAUSED",
              stripeCustomerId: subscription.customer?.toString() ?? undefined
            }
          });
          console.log("[webhook] user set to PRO from subscription", { id: updatedUser.id, plan: updatedUser.plan, status: updatedUser.planStatus });
        } else {
          console.warn("[webhook] skipped subscription update - no userId", { metadataUserId: subscription.metadata?.userId, customer: subscription.customer?.toString() });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription);
        console.log("[webhook] subscription deleted", { userId, customer: subscription.customer?.toString() });

        if (userId) {
          const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "FREE",
              planStatus: "PAUSED"
            }
          });
          console.log("[webhook] user downgraded to FREE", { id: updatedUser.id, plan: updatedUser.plan });
        } else {
          console.warn("[webhook] skipped downgrade - no userId", { metadataUserId: subscription.metadata?.userId, customer: subscription.customer?.toString() });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handling error", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
