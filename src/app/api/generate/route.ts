import { NextRequest, NextResponse } from "next/server";
import { createTrip, getTripBySlug } from "@/lib/db";
import { runGeneration } from "@/lib/generate";
import { generateSlug } from "@/lib/slug";
import { verifyStripeSession } from "@/lib/stripe";
import { WizardData } from "@/types/trip";

export const maxDuration = 300; // 5 min — Vercel Pro allows up to 300s

export async function POST(req: NextRequest) {
  let slug: string | undefined;

  try {
    const body = await req.json();
    const { wizardData, stripeSessionId, slug: existingSlug } = body as {
      wizardData?: WizardData;
      stripeSessionId?: string;
      slug?: string;
    };

    if (existingSlug) {
      slug = existingSlug;
      const existing = await getTripBySlug(slug);
      if (!existing) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }
    } else {
      if (!wizardData?.destination || !wizardData?.email) {
        return NextResponse.json({ error: "Missing required wizard data" }, { status: 400 });
      }

      // Only verify payment when creating a new trip. An existing slug was
      // already created (and paid for) through the checkout flow.
      if (stripeSessionId) {
        const paid = await verifyStripeSession(stripeSessionId);
        if (!paid) {
          return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
        }
      }

      slug = generateSlug();
      await createTrip({
        slug,
        email: wizardData.email,
        tripNickname: wizardData.tripNickname || wizardData.destination,
        wizardData,
        stripeSessionId,
      });
    }

    // Runs synchronously — Next.js serverless kills the process once the
    // response returns, so fire-and-forget is unreliable. The client polls
    // /api/trip; this request simply stays open until generation settles.
    const outcome = await runGeneration(slug);

    switch (outcome.status) {
      case "done":
        return NextResponse.json({ slug });
      case "already-running":
        // Another path (usually the Stripe webhook) got there first. Not an
        // error — the client's polling will pick up the result.
        return NextResponse.json({ slug, alreadyGenerating: true });
      case "not-found":
        return NextResponse.json({ error: "Trip not found", slug }, { status: 404 });
      case "failed":
        return NextResponse.json({ error: "Generation failed", slug }, { status: 500 });
    }
  } catch (error) {
    console.error("Generate route error:", error);
    return NextResponse.json({ error: "Generation failed", slug }, { status: 500 });
  }
}
