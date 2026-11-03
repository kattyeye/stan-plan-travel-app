import { NextRequest, NextResponse, after } from "next/server";
import { createTrip, updateTripStripeSession } from "@/lib/db";
import { getDraft } from "@/lib/partners/drafts";
import { runPipeline } from "@/lib/pipeline";
import { claimFreePlan, releaseFreePlan } from "@/lib/billing";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";
import { generateSlug } from "@/lib/slug";
import { createCheckoutSession, stripeEnabled } from "@/lib/stripe";
import { parseWizardData } from "@/lib/validation";

export const maxDuration = 300;

/**
 * Wizard submit. Validates the trip server-side and stores it. A guest's first
 * plan is free (see lib/billing.ts) and starts generating immediately; later
 * plans go through Stripe and start when payment is confirmed.
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
    const ip = clientIp(req);
    const free = await claimFreePlan(wizardData.email, ip);

    if (free.free) {
      // First plan for this email: no checkout, start building right away.
      try {
        await createTrip({ slug, email: wizardData.email, tripNickname: wizardData.tripNickname, wizardData, status: "paid", billing: "free", partner });
      } catch (err) {
        await releaseFreePlan(wizardData.email).catch(() => {});
        throw err;
      }
      after(() => runPipeline(slug, "research"));
      return NextResponse.json({ url: `${origin}/trip/${slug}/generating`, slug, free: true });
    }

    if (!stripeEnabled()) {
      // Payments aren't switched on yet, so there's no way to pay for another plan.
      const message =
        free.reason === "used"
          ? "You've already used your free plan with this email. Paid plans are coming soon."
          : "We've hit today's limit for free plans — please try again tomorrow.";
      return NextResponse.json({ error: message, reason: free.reason }, { status: 402 });
    }

    await createTrip({ slug, email: wizardData.email, tripNickname: wizardData.tripNickname, wizardData, billing: "stripe", partner });
    const { url, sessionId } = await createCheckoutSession({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname,
      origin: process.env.NEXT_PUBLIC_APP_URL ?? origin,
    });
    await updateTripStripeSession(slug, sessionId);
    return NextResponse.json({ url, slug, free: false, reason: free.reason });
  } catch (error) {
    console.error("Checkout error:", error);
    const storageDown = /ENOTFOUND|fetch failed|Redis is not configured/i.test(`${error} ${(error as { cause?: unknown })?.cause ?? ""}`);
    return NextResponse.json(
      {
        error: storageDown
          ? "We can't save new trips right now — we're on it. Your answers are kept, so please try again shortly."
          : "We couldn't start checkout. Please try again in a moment.",
      },
      { status: storageDown ? 503 : 500 }
    );
  }
}
