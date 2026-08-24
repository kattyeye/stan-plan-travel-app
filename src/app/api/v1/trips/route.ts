import { NextRequest, NextResponse } from "next/server";
import { REFERRAL_COOKIE, normalizeReferralCode } from "@/core/referral";
import { TripValidationError, startTrip } from "@/lib/trips";
import type { WizardData } from "@/types/trip";

/**
 * POST /api/v1/trips
 *
 * Create a trip and get a checkout URL.
 * Body: { wizardData: Partial<WizardData>, referralCode?: string }
 *
 * Native clients have no cookie jar, so `referralCode` may be passed in the
 * body; the cookie is used when present (web).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      wizardData?: Partial<WizardData>;
      referralCode?: string;
    };

    const referralCode =
      normalizeReferralCode(req.cookies.get(REFERRAL_COOKIE)?.value) ??
      normalizeReferralCode(body.referralCode);

    const result = await startTrip(body.wizardData ?? {}, {
      referralCode: referralCode ?? undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TripValidationError) {
      return NextResponse.json(
        { error: "Missing required fields", missing: error.missing },
        { status: 400 },
      );
    }
    console.error("v1 create trip error:", error);
    return NextResponse.json({ error: "Could not create trip" }, { status: 500 });
  }
}
