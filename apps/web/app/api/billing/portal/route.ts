import { NextResponse } from "next/server";
import { stripe } from "../../../../lib/stripe";
import { requireUser } from "../../../../lib/auth";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripe || !user.stripeCustomerId) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 500 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/app/canvas`
    });
    return NextResponse.redirect(session.url, 303);
  } catch (err: any) {
    console.error("stripe portal error", err);
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500 });
  }
}

