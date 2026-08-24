import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { updateTripStatus, updateTripStripeSession } from "@/lib/db";
import { runGeneration } from "@/lib/generate";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    const payload = Buffer.from(await req.arrayBuffer());
    event = await constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const slug = session.metadata?.slug;

    if (!slug) {
      console.error("Webhook: no slug in session metadata", session.id);
      return NextResponse.json({ received: true });
    }

    try {
      // Attach session ID to trip record and mark paid
      await updateTripStripeSession(slug, session.id);
      await updateTripStatus(slug, "paid");

      // Fire off generation — the webhook must return quickly, so we don't
      // await. runGeneration takes a Redis lock, so if the generating page
      // also tries to start this trip only one of them calls Claude.
      runGeneration(slug).catch((err) => {
        console.error(`Generation failed for ${slug}:`, err);
      });
    } catch (err) {
      console.error(`Webhook processing failed for slug ${slug}:`, err);
    }
  }

  return NextResponse.json({ received: true });
}
