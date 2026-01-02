export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { stripe } from "../../../../lib/stripe";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const priceId = process.env.STRIPE_PRICE_PRO;

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user.stripeCustomerId || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing/success`,
    cancel_url: `${appUrl}/billing/cancel`,
    subscription_data: {
      metadata: { userId: user.id }
    },
    metadata: { userId: user.id }
  });

  if (!session.url) {
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }

  // Redirect directly so form submissions send the user to Stripe Checkout.
  return NextResponse.redirect(session.url, { status: 303 });
}
