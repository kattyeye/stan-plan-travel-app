import { NextRequest, NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { getTripBySlug, updateTrip, updateTripStripeSession } from "@/lib/db";
import { runPipeline } from "@/lib/pipeline";
import { constructWebhookEvent, isSessionSettled, paymentFromSession } from "@/lib/stripe";

export const maxDuration = 300;

/**
 * Stripe webhook. Verifies the signature, ignores replays, marks the trip paid
 * and starts generation after responding (so Stripe never waits on Claude).
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const payload = Buffer.from(await req.arrayBuffer());
    event = await constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const slug = session.metadata?.slug;
  if (!slug) {
    console.error("Webhook: no slug in session metadata", session.id);
    return NextResponse.json({ received: true });
  }
  if (!isSessionSettled(session)) {
    // e.g. bank transfers: wait for async_payment_succeeded.
    return NextResponse.json({ received: true });
  }

  try {
    const trip = await getTripBySlug(slug);
    if (!trip) {
      console.error(`Webhook: trip ${slug} not found for session ${session.id}`);
      return NextResponse.json({ received: true });
    }
    // Replays and late deliveries: the success page may already have started it.
    if (trip.status === "ready" || trip.status === "generating") return NextResponse.json({ received: true });

    if (trip.stripeSessionId !== session.id) await updateTripStripeSession(slug, session.id);
    await updateTrip(slug, { status: "paid", billing: "stripe", payment: paymentFromSession(session) });
    // Generation is idempotent: a per-trip lock and checkpoints stop double runs.
    after(() => runPipeline(slug));
  } catch (err) {
    console.error(`Webhook processing failed for ${slug}:`, err);
    // 500 makes Stripe retry later.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
