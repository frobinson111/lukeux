import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  console.warn("STRIPE_SECRET_KEY not set; billing endpoints will be disabled.");
}

export const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: "2025-12-15.clover"
    })
  : null;
