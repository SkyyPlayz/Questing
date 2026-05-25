import Stripe from "stripe";

export class StripeConfigurationError extends Error {
  constructor(readonly envVar: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET") {
    super(`${envVar} is not configured`);
    this.name = "StripeConfigurationError";
  }
}

function createStripeClient(secretKey: string) {
  return new Stripe(secretKey);
}

let cachedStripe: ReturnType<typeof createStripeClient> | null = null;
let cachedSecretKey: string | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new StripeConfigurationError("STRIPE_SECRET_KEY");
  }

  if (!cachedStripe || cachedSecretKey !== secretKey) {
    cachedStripe = createStripeClient(secretKey);
    cachedSecretKey = secretKey;
  }

  return cachedStripe;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new StripeConfigurationError("STRIPE_WEBHOOK_SECRET");
  }

  return webhookSecret;
}

export function isStripeConfigurationError(error: unknown): error is StripeConfigurationError {
  return error instanceof StripeConfigurationError;
}
