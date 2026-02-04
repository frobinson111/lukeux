import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.warn("STRIPE_SECRET_KEY not set; billing endpoints will be disabled.");
}

export const stripe = stripeSecret
  // Do not pin apiVersion here; the Stripe SDK's TypeScript types are strict about
  // allowable versions and can differ between environments depending on resolved SDK version.
  ? new Stripe(stripeSecret)
  : null;
