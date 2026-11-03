import Stripe from "stripe";
import { appOrigin } from "./security";

let stripe: Stripe | null = null;

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

/** Price in cents; override with TRIP_PRICE_CENTS. */
export const PRICE_CENTS = Number(process.env.TRIP_PRICE_CENTS ?? 1900);

export async function createCheckoutSession(data: {
  slug: string;
  email: string;
  tripNickname: string;
  origin?: string;
}): Promise<{ url: string; sessionId: string }> {
  const appUrl = data.origin ?? appOrigin();
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: data.email,
    client_reference_id: data.slug,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `Irie — ${data.tripNickname || "Your Trip"}`,
            description: "Personalized trip plan: itinerary, meals & recipes, grocery list, verified restaurant guide and packing list.",
          },
        },
      },
    ],
    metadata: { slug: data.slug },
    payment_intent_data: { metadata: { slug: data.slug } },
    success_url: `${appUrl}/trip/${data.slug}/generating?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/wizard?cancelled=true`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id };
}

/** Confirms a Checkout Session is paid and belongs to this trip. */
export async function verifyStripeSession(sessionId: string, slug: string): Promise<boolean> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return session.payment_status === "paid" && session.metadata?.slug === slug;
}

export async function constructWebhookEvent(payload: Buffer, signature: string): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}
