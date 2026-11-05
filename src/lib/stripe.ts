import Stripe from "stripe";
import type { TripRecord } from "@/types/trip";
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
    // Promotion codes are created in the Stripe dashboard (e.g. a 100%-off beta code).
    allow_promotion_codes: true,
    // A receipt is emailed for every live payment, whatever the dashboard's email settings.
    payment_intent_data: { metadata: { slug: data.slug }, receipt_email: data.email },
    // Sales tax/VAT via Stripe Tax — only once it's set up in the dashboard, or Checkout errors.
    ...(process.env.STRIPE_AUTOMATIC_TAX === "true" ? { automatic_tax: { enabled: true } } : {}),
    success_url: `${appUrl}/trip/${data.slug}/generating?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/wizard?cancelled=true`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id };
}

/**
 * Paid, or free because a 100%-off promotion code brought the total to zero
 * (Stripe reports those as "no_payment_required").
 */
export function isSessionSettled(session: Pick<Stripe.Checkout.Session, "payment_status">): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

/** What was actually charged, for the trip record and the admin dashboard. */
export function paymentFromSession(session: Pick<Stripe.Checkout.Session, "amount_total" | "currency" | "total_details">): NonNullable<TripRecord["payment"]> {
  return {
    amountCents: session.amount_total ?? 0,
    discountCents: session.total_details?.amount_discount ?? 0,
    currency: session.currency ?? "usd",
    at: new Date().toISOString(),
  };
}

/** Confirms a Checkout Session is settled and belongs to this trip; returns what was charged. */
export async function verifyStripeSession(sessionId: string, slug: string): Promise<NonNullable<TripRecord["payment"]> | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return isSessionSettled(session) && session.metadata?.slug === slug ? paymentFromSession(session) : null;
}

export async function constructWebhookEvent(payload: Buffer, signature: string): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}
