import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { getTripByStripeSession, updateTripStatus, updateTripStripeSession } from "@/lib/db";
import { generateTripJSON, generateTripHTML } from "@/lib/claude";
import { saveTripData } from "@/lib/db";

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

      // Fire off generation — webhook must return quickly so we don't await
      triggerGeneration(slug).catch((err) => {
        console.error(`Generation failed for ${slug}:`, err);
        updateTripStatus(slug, "error").catch(() => {});
      });
    } catch (err) {
      console.error(`Webhook processing failed for slug ${slug}:`, err);
    }
  }

  return NextResponse.json({ received: true });
}

async function triggerGeneration(slug: string) {
  const { getTripBySlug } = await import("@/lib/db");
  const trip = await getTripBySlug(slug);
  if (!trip) throw new Error(`Trip not found: ${slug}`);

  await updateTripStatus(slug, "generating");
  const generatedData = await generateTripJSON(trip.wizardData);
  const htmlBlob = await generateTripHTML(generatedData);
  await saveTripData(slug, generatedData, htmlBlob);
}
