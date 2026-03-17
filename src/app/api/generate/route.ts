import { NextRequest, NextResponse } from "next/server";
import { generateTripJSON, generateTripHTML } from "@/lib/claude";
import { createTrip, updateTripStatus, saveTripData } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { verifyStripeSession } from "@/lib/stripe";
import { WizardData } from "@/types/trip";

export const maxDuration = 300; // 5 min — Vercel Pro allows up to 300s

export async function POST(req: NextRequest) {
  let slug: string | undefined;

  try {
    const body = await req.json();
    const { wizardData, stripeSessionId, slug: existingSlug } = body as {
      wizardData: WizardData;
      stripeSessionId?: string;
      slug?: string;
    };

    if (!wizardData?.destination || !wizardData?.email) {
      return NextResponse.json({ error: "Missing required wizard data" }, { status: 400 });
    }

    // Verify Stripe payment if a session ID was provided
    if (stripeSessionId) {
      const paid = await verifyStripeSession(stripeSessionId);
      if (!paid) {
        return NextResponse.json({ error: "Payment not confirmed" }, { status: 402 });
      }
    }

    if (existingSlug) {
      slug = existingSlug;
    } else {
      slug = generateSlug();
      await createTrip({
        slug,
        email: wizardData.email,
        tripNickname: wizardData.tripNickname || wizardData.destination,
        wizardData,
        stripeSessionId,
      });
    }

    await updateTripStatus(slug, "generating");

    // Run generation synchronously — Next.js serverless kills the process
    // once the response returns, so fire-and-forget doesn't work reliably.
    // The client polls for status; this request stays open until done.
    try {
      const generatedData = await generateTripJSON(wizardData);
      const htmlBlob = await generateTripHTML(generatedData);
      await saveTripData(slug, generatedData, htmlBlob);
    } catch (genErr) {
      console.error(`Generation failed for slug ${slug}:`, genErr);
      await updateTripStatus(slug, "error");
      return NextResponse.json({ error: "Generation failed", slug }, { status: 500 });
    }

    return NextResponse.json({ slug });
  } catch (error) {
    console.error("Generate route error:", error);
    if (slug) await updateTripStatus(slug, "error").catch(() => {});
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
