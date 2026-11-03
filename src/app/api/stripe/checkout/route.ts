import { NextRequest, NextResponse, after } from "next/server";
import { createTrip, updateTripStripeSession } from "@/lib/db";
import { getDraft } from "@/lib/partners/drafts";
import { runPipeline } from "@/lib/pipeline";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";
import { generateSlug } from "@/lib/slug";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { parseWizardData } from "@/lib/validation";

export const maxDuration = 300;

/**
 * Wizard submit. Validates the trip server-side, stores it, and either sends
 * the guest to Stripe (generation starts when payment is confirmed) or, when
 * payments aren't configured, starts generating immediately.
 */
export async function POST(req: NextRequest) {
  const limit = await rateLimit("checkout", clientIp(req), 8, 3600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let body: { wizardData?: unknown; draftId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Partner drafts carry the listing and attribution; read them server-side, never from the browser.
  const draft = typeof body.draftId === "string" ? await getDraft(body.draftId) : null;
  const raw = body.wizardData && typeof body.wizardData === "object" ? { ...(body.wizardData as Record<string, unknown>) } : {};
  delete raw.property;
  delete raw.partner;
  if (draft?.property) {
    raw.property = draft.property;
    raw.propertyAmenities = [...new Set([...((raw.propertyAmenities as string[]) ?? []), ...draft.property.amenities])].slice(0, 40);
  }

  const parsed = parseWizardData(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, fields: parsed.fields }, { status: 400 });
  }
  const partner = draft?.partner;
  const wizardData = { ...parsed.data, ...(partner ? { partner } : {}) };
  const origin = new URL(req.url).origin;

  try {
    const slug = generateSlug();

    if (!stripeEnabled()) {
      // Payments not configured (local dev or free beta): generate right away.
      await createTrip({ slug, email: wizardData.email, tripNickname: wizardData.tripNickname, wizardData, status: "paid", billing: "free", partner });
      after(() => runPipeline(slug, "research"));
      return NextResponse.json({ url: `${origin}/trip/${slug}/generating`, slug });
    }

    await createTrip({ slug, email: wizardData.email, tripNickname: wizardData.tripNickname, wizardData, billing: "stripe", partner });
    const { url, sessionId } = await createCheckoutSession({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname,
      origin: process.env.NEXT_PUBLIC_APP_URL ?? origin,
    });
    await updateTripStripeSession(slug, sessionId);
    return NextResponse.json({ url, slug });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "We couldn't start checkout. Please try again in a moment." }, { status: 500 });
  }
}
