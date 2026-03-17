import { NextRequest, NextResponse } from "next/server";
import { generateTripJSON, generateTripHTML } from "@/lib/claude";
import { createTrip, updateTripStatus, saveTripData } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { verifyStripeSession } from "@/lib/stripe";
import { WizardData } from "@/types/trip";

export async function POST(req: NextRequest) {
  let slug: string | undefined;

  try {
    const body = await req.json();
    const { wizardData, stripeSessionId } = body as {
      wizardData: WizardData;
      stripeSessionId?: string;
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

    // Create the trip record immediately so we have a slug to redirect to
    slug = generateSlug();
    await createTrip({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname || wizardData.destination,
      wizardData,
      stripeSessionId,
    });

    // Mark as generating — client can poll /api/trip?slug= and wait
    await updateTripStatus(slug, "generating");

    // Run generation async so we can return the slug right away
    // The client will poll for status changes
    generateAndSave(slug, wizardData).catch((err) => {
      console.error(`Generation failed for slug ${slug}:`, err);
      updateTripStatus(slug!, "error").catch(() => {});
    });

    return NextResponse.json({ slug });
  } catch (error) {
    console.error("Generate route error:", error);
    if (slug) {
      await updateTripStatus(slug, "error").catch(() => {});
    }
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

async function generateAndSave(slug: string, wizardData: WizardData) {
  // Step 1: Generate structured JSON from Claude
  const generatedData = await generateTripJSON(wizardData);

  // Step 2: Generate self-contained HTML from the JSON
  const htmlBlob = await generateTripHTML(generatedData);

  // Step 3: Save both to DB and mark ready
  await saveTripData(slug, generatedData, htmlBlob);
}
