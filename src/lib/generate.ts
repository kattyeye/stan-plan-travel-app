import { generateTripJSON, generateTripHTML } from "@/lib/claude";
import {
  acquireGenerationLock,
  getTripBySlug,
  releaseGenerationLock,
  saveTripData,
  updateTripStatus,
} from "@/lib/db";

export type GenerationOutcome =
  | { status: "done" }
  | { status: "already-running" }
  | { status: "not-found" }
  | { status: "failed"; error: unknown };

/**
 * Generate a trip exactly once.
 *
 * Both the Stripe webhook and the generating page can reach this for the same
 * slug; the Redis lock guarantees only one actually calls Claude. Callers that
 * lose the race get "already-running" and should simply let the client keep
 * polling for status.
 */
export async function runGeneration(slug: string): Promise<GenerationOutcome> {
  const trip = await getTripBySlug(slug);
  if (!trip) return { status: "not-found" };

  // Nothing to do if a previous run already finished.
  if (trip.status === "ready" && trip.generatedData) return { status: "done" };

  const acquired = await acquireGenerationLock(slug);
  if (!acquired) return { status: "already-running" };

  try {
    await updateTripStatus(slug, "generating");
    const generatedData = await generateTripJSON(trip.wizardData);
    const htmlBlob = await generateTripHTML(generatedData);
    await saveTripData(slug, generatedData, htmlBlob);
    return { status: "done" };
  } catch (error) {
    console.error(`Generation failed for slug ${slug}:`, error);
    await updateTripStatus(slug, "error").catch(() => {});
    return { status: "failed", error };
  } finally {
    // Always release: a failed run must be retryable immediately.
    await releaseGenerationLock(slug).catch(() => {});
  }
}
