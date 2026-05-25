import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Returns the Stripe client, creating it lazily on first call.
 * Throws a descriptive error if STRIPE_SECRET_KEY is not set so that
 * misconfigured environments get a clear message at request time rather
 * than a cryptic failure at module-load / build time.
 */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is not set. " +
        "Configure it in your .env.local file or deployment environment.",
    );
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}
