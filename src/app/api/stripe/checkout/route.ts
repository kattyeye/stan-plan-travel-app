import { NextRequest, NextResponse } from "next/server";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/core/referral";
import { TripValidationError, startTrip } from "@/lib/trips";
import { WizardData } from "@/types/trip";

/**
 * Legacy checkout endpoint, kept so existing clients keep working.
 * New clients should use POST /api/v1/trips, which shares the same handler.
 */
export async function POST(req: NextRequest) {
  try {
    const { wizardData } = (await req.json()) as { wizardData: Partial<WizardData> };
    const referralCode = normalizeReferralCode(req.cookies.get(REFERRAL_COOKIE)?.value);

    const result = await startTrip(wizardData ?? {}, { referralCode: referralCode ?? undefined });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TripValidationError) {
      return NextResponse.json({ error: "Missing required fields", missing: error.missing }, { status: 400 });
    }
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
