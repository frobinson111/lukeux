import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/prisma";
import { stripe } from "../../../../lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
        const userId = session.metadata?.userId;
        const customerId = session.customer?.toString();
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
        const userId = subscription.metadata?.userId;
        const status = subscription.status;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "PRO",
              planStatus: status === "active" ? "ACTIVE" : "PAUSED"
            }
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "FREE",
              planStatus: "PAUSED"
            }
          });
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
