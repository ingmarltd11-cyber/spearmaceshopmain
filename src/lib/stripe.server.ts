// Server-only. Never import from client components.
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it in your hosting environment (Vercel / Lovable).",
    );
  }
  if (!_stripe) {
    _stripe = new Stripe(key, {
      apiVersion: "2025-07-30.basil",
      typescript: true,
    });
  }
  return _stripe;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. Create a webhook in Stripe Dashboard and paste the signing secret.",
    );
  }
  return secret;
}
