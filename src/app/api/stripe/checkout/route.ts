import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { createTrip } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { WizardData } from "@/types/trip";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/core/referral";

export async function POST(req: NextRequest) {
  try {
    const { wizardData } = await req.json() as { wizardData: WizardData };

    if (!wizardData?.email || !wizardData?.destination) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attribute the sale to whichever creator sent this visitor, if any.
    const referralCode = normalizeReferralCode(req.cookies.get(REFERRAL_COOKIE)?.value);

    const slug = generateSlug();
    await createTrip({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname || wizardData.destination,
      wizardData,
      referralCode: referralCode ?? undefined,
    });

    // Skip Stripe if no key is configured — go straight to generation
    if (!process.env.STRIPE_SECRET_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return NextResponse.json({ url: `${appUrl}/trip/${slug}/generating`, slug });
    }

    const checkoutUrl = await createCheckoutSession({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname || wizardData.destination,
      referralCode: referralCode ?? undefined,
    });

    return NextResponse.json({ url: checkoutUrl, slug });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
