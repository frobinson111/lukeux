import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { stripe } from "../../../../lib/stripe";

const priceId = process.env.STRIPE_PRICE_PRO;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/canvas?upgrade=success`,
      cancel_url: `${appUrl}/app/canvas?upgrade=cancel`,
      metadata: {
        userId: user.id
      }
    });

    return NextResponse.redirect(session.url || appUrl, 303);
  } catch (err: any) {
    console.error("stripe checkout error", err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
