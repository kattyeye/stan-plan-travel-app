import { after } from "next/server";
import type { TripRecord } from "@/types/trip";
import { claimFreePlan, releaseFreePlan, type FreeDecision } from "../billing";
import { claimBetaPlan } from "../beta";
import { createTrip, updateTripStripeSession } from "../db";
import { getDraft } from "../partners/drafts";
import { runPipeline } from "../pipeline";
import { generateSlug } from "../slug";
import { createCheckoutSession, stripeEnabled } from "../stripe";
import { parseWizardData } from "../validation";

/**
 * Turns wizard answers into a trip. Shared by the website's checkout route and
 * the public client API (/api/v1/client/trips), so pricing, validation and
 * free-plan rules can't drift between them.
 *
 * Must be called from a route handler: free plans start generating via after().
 */
export type StartTripResult =
  | { ok: true; slug: string; payment: "free"; nextUrl: string }
  | { ok: true; slug: string; payment: "checkout"; nextUrl: string; freeReason: Exclude<FreeDecision, { free: true }>["reason"] }
  | { ok: false; status: number; type: "invalid_request" | "payment_required" | "storage_unavailable" | "server_error"; message: string; fields?: Record<string, string>; reason?: string };

export async function startTrip(input: {
  wizardData: unknown;
  draftId?: unknown;
  ip: string;
  /** Origin for the "waiting" page link. */
  origin: string;
}): Promise<StartTripResult> {
  try {
    // Partner drafts carry the listing and attribution; read them server-side, never from the client.
    const draft = typeof input.draftId === "string" ? await getDraft(input.draftId) : null;
    const raw = input.wizardData && typeof input.wizardData === "object" ? { ...(input.wizardData as Record<string, unknown>) } : {};
    delete raw.property;
    delete raw.partner;
    if (draft?.property) {
      raw.property = draft.property;
      raw.propertyAmenities = [...new Set([...((raw.propertyAmenities as string[]) ?? []), ...draft.property.amenities])].slice(0, 40);
    }

    const parsed = parseWizardData(raw);
    if (!parsed.ok) return { ok: false, status: 400, type: "invalid_request", message: parsed.error, fields: parsed.fields };

    const partner = draft?.partner;
    const wizardData = { ...parsed.data, ...(partner ? { partner } : {}) };
    const base = { email: wizardData.email, tripNickname: wizardData.tripNickname, wizardData, partner } satisfies Partial<Parameters<typeof createTrip>[0]>;
    const slug = generateSlug();

    // Beta testers ("evergreen" users added in the admin dashboard): always free, never limited by the free-plan rules.
    if (await claimBetaPlan(wizardData.email)) {
      await createTrip({ slug, ...base, status: "paid", billing: "comp" });
      after(() => runPipeline(slug, "research"));
      return { ok: true, slug, payment: "free", nextUrl: `${input.origin}/trip/${slug}/generating` };
    }

    const free = await claimFreePlan(wizardData.email, input.ip);
    if (free.free) {
      try {
        await createTrip({ slug, ...base, status: "paid", billing: "free" });
      } catch (err) {
        await releaseFreePlan(wizardData.email).catch(() => {});
        throw err;
      }
      after(() => runPipeline(slug, "research"));
      return { ok: true, slug, payment: "free", nextUrl: `${input.origin}/trip/${slug}/generating` };
    }

    if (!stripeEnabled()) {
      // Payments aren't switched on, so there's no way to pay for another plan yet.
      return {
        ok: false,
        status: 402,
        type: "payment_required",
        reason: free.reason,
        message:
          free.reason === "used"
            ? "You've already used your free plan with this email. Paid plans are coming soon."
            : "We've hit today's limit for free plans — please try again tomorrow.",
      };
    }

    await createTrip({ slug, ...base, billing: "stripe" });
    const { url, sessionId } = await createCheckoutSession({
      slug,
      email: wizardData.email,
      tripNickname: wizardData.tripNickname,
      origin: process.env.NEXT_PUBLIC_APP_URL ?? input.origin,
    });
    await updateTripStripeSession(slug, sessionId);
    return { ok: true, slug, payment: "checkout", nextUrl: url, freeReason: free.reason };
  } catch (error) {
    console.error("startTrip error:", error);
    const storageDown = /ENOTFOUND|fetch failed|Redis is not configured/i.test(`${error} ${(error as { cause?: unknown })?.cause ?? ""}`);
    return storageDown
      ? { ok: false, status: 503, type: "storage_unavailable", message: "We can't save new trips right now — we're on it. Please try again shortly." }
      : { ok: false, status: 500, type: "server_error", message: "We couldn't start your trip. Please try again in a moment." };
  }
}

/** The public view of a trip's progress — no email, no raw wizard answers. */
export function tripStatusView(t: TripRecord) {
  return {
    id: t.slug,
    status: t.status,
    tripNickname: t.tripNickname,
    destination: t.wizardData.destination,
    startDate: t.wizardData.startDate,
    endDate: t.wizardData.endDate,
    progress: t.progress ?? null,
    errorMessage: t.status === "error" ? t.errorMessage ?? "Something went wrong." : null,
  };
}
