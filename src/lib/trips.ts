import { createTrip } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { createCheckoutSession } from "@/lib/stripe";
import { applyDefaults, missingRequiredFields } from "@/core/wizard-machine";
import type { WizardData } from "@/types/trip";

export interface StartTripResult {
  slug: string;
  /** Stripe Checkout URL, or the generating page when Stripe isn't configured. */
  url: string;
}

/**
 * Create a trip record and return where to send the customer next.
 *
 * Shared by the legacy /api/stripe/checkout route and POST /api/v1/trips so the
 * two intake surfaces cannot drift apart.
 */
export async function startTrip(
  input: Partial<WizardData>,
  options: { referralCode?: string } = {},
): Promise<StartTripResult> {
  const missing = missingRequiredFields(input);
  if (missing.length > 0) {
    throw new TripValidationError(missing);
  }

  const wizardData = applyDefaults(input);
  const slug = generateSlug();

  await createTrip({
    slug,
    email: wizardData.email,
    tripNickname: wizardData.tripNickname,
    wizardData,
    referralCode: options.referralCode,
  });

  // No Stripe key configured (local dev) — skip payment and go straight to
  // generation rather than failing.
  if (!process.env.STRIPE_SECRET_KEY) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return { slug, url: `${appUrl}/trip/${slug}/generating` };
  }

  const url = await createCheckoutSession({
    slug,
    email: wizardData.email,
    tripNickname: wizardData.tripNickname,
    referralCode: options.referralCode,
  });

  return { slug, url };
}

export class TripValidationError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing required fields: ${missing.join(", ")}`);
    this.name = "TripValidationError";
  }
}
