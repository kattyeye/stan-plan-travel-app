import Stripe from "stripe";

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PRICE_CENTS = 1900; // $19.00

export async function createCheckoutSession(data: {
  slug: string;
  email: string;
  tripNickname: string;
}): Promise<string> {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: data.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `Irie — ${data.tripNickname || "Your Trip"}`,
            description: "AI-generated personalized travel plan with itinerary, meals, grocery list, and more.",
          },
        },
      },
    ],
    metadata: {
      slug: data.slug,
      email: data.email,
    },
    success_url: `${appUrl}/trip/${data.slug}/generating?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/wizard?cancelled=true`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function verifyStripeSession(sessionId: string): Promise<boolean> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session.payment_status === "paid";
}

export async function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
