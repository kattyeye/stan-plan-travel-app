import type { TripRecord } from "@/types/trip";

/** The stable, versioned shape partners see. Internal fields stay internal. */
export function publicTrip(t: TripRecord, origin: string, opts: { includePlan?: boolean } = {}) {
  const includePlan = opts.includePlan ?? true;
  return {
    object: "trip",
    id: t.slug,
    status: t.status === "pending" ? "awaiting_payment" : t.status === "paid" ? "queued" : t.status,
    externalRef: t.partner?.externalRef ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    progress: t.progress ? { stage: t.progress.stage, percent: t.progress.percent, message: t.progress.message } : null,
    urls: {
      trip: `${origin}/trip/${t.slug}`,
      download: `${origin}/api/trip/${t.slug}/download`,
      api: `${origin}/api/v1/trips/${t.slug}`,
    },
    summary: {
      destination: t.wizardData.destination,
      startDate: t.wizardData.startDate,
      endDate: t.wizardData.endDate,
      guests: { adults: t.wizardData.numAdults, kids: t.wizardData.numKids },
      listingId: t.wizardData.property?.externalId ?? null,
    },
    quality: t.generatedData?.quality ? { venues: t.generatedData.quality.venues, checkedAt: t.generatedData.quality.checkedAt } : null,
    plan: includePlan && t.status === "ready" ? t.generatedData ?? null : null,
  };
}
