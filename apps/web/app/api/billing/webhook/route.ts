import { NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { prisma } from "../../../../lib/prisma";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("stripe webhook signature error", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const customerId = session.customer as string | undefined;
        const userId = session.metadata?.userId as string | undefined;
        if (customerId) {
          if (userId) {
            await prisma.user.updateMany({
              where: { id: userId },
              data: { stripeCustomerId: customerId, plan: "PRO", planStatus: "ACTIVE" }
            });
          } else {
            await prisma.user.updateMany({
              where: { stripeCustomerId: customerId },
              data: { plan: "PRO", planStatus: "ACTIVE" }
            });
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string | undefined;
        if (customerId) {
          const status = mapSubStatus(sub.status);
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: status.plan === "FREE" ? { plan: "FREE", planStatus: "ACTIVE" } : { plan: "PRO", planStatus: status.planStatus }
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string | undefined;
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { plan: "FREE", planStatus: "ACTIVE" }
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as any;
        const customerId = inv.customer as string | undefined;
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { plan: "PRO", planStatus: "SUSPENDED" }
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err: any) {
    console.error("stripe webhook processing error", err);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapSubStatus(status: string) {
  switch (status) {
    case "active":
    case "trialing":
      return { plan: "PRO" as const, planStatus: "ACTIVE" as const };
    case "past_due":
    case "unpaid":
      return { plan: "PRO" as const, planStatus: "SUSPENDED" as const };
    case "canceled":
    case "incomplete_expired":
    default:
      return { plan: "FREE" as const, planStatus: "ACTIVE" as const };
  }
}
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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer?.toString();
        if (userId && customerId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              plan: "PRO",
              planStatus: "ACTIVE"
            }
          });
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
