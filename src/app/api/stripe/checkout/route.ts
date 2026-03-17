import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { createTrip } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { WizardData } from "@/types/trip";

export async function POST(req: NextRequest) {
  try {
    const { wizardData } = await req.json() as { wizardData: WizardData };

    if (!wizardData?.email || !wizardData?.destination) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create the trip record first so we have a slug for the Stripe success URL
    const slug = generateSlug();
    await createTrip({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname || wizardData.destination,
      wizardData,
    });

    const checkoutUrl = await createCheckoutSession({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname || wizardData.destination,
    });

    return NextResponse.json({ url: checkoutUrl, slug });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
