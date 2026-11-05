import { after } from "next/server";
import type { TripProgress, TripStatus } from "@/types/trip";
import { getPipelineState, getTripBySlug, savePipelineState, updateTrip, updateTripStripeSession } from "../db";
import { isGenerationRunning, pipelineNextStage, runPipeline } from "../pipeline";
import { rateLimit } from "../security";
import { stripeEnabled, verifyStripeSession } from "../stripe";

/** A stage that hasn't reported progress for this long is considered stalled. */
const STALE_MS = 45_000;

export type ResumeResult =
  | { kind: "not_found" }
  | { kind: "rate_limited"; retryAfter: number }
  | { kind: "ok"; status: TripStatus; progress: TripProgress | null; started: boolean };

/**
 * Makes sure a paid trip is actually being built, recovering from anything that
 * can go wrong in between:
 *   - the Stripe webhook is late or misconfigured → verify the Checkout Session directly
 *   - a stage hand-off was lost or a function timed out → restart from the last checkpoint
 *   - the guest taps "Try again" after an error → reset retry counters and go again
 * It never starts generation for an unpaid trip. Shared by the website's
 * waiting page and the client API. Must run inside a route handler (uses after()).
 */
export async function resumeTrip(slug: string, opts: { sessionId?: string; retry?: boolean } = {}): Promise<ResumeResult> {
  const limit = await rateLimit("resume", slug, 20, 600);
  if (!limit.ok) return { kind: "rate_limited", retryAfter: limit.retryAfter };

  let trip = await getTripBySlug(slug);
  if (!trip) return { kind: "not_found" };
  const done = (started: boolean): ResumeResult => ({ kind: "ok", status: trip!.status, progress: trip!.progress ?? null, started });

  if (trip.status === "ready") return done(false);

  if (trip.status === "pending") {
    if (!stripeEnabled() || !opts.sessionId) return done(false);
    let payment: Awaited<ReturnType<typeof verifyStripeSession>> = null;
    try {
      payment = await verifyStripeSession(opts.sessionId, slug);
    } catch (err) {
      console.error(`resume: could not verify session for ${slug}:`, err);
    }
    if (!payment) return done(false);
    await updateTripStripeSession(slug, opts.sessionId);
    trip = await updateTrip(slug, { status: "paid", billing: "stripe", payment });
  }

  if (trip.status === "error") {
    if (!opts.retry) return done(false);
    const limitRetry = await rateLimit("retry", slug, 3, 3600);
    if (!limitRetry.ok) return { kind: "rate_limited", retryAfter: limitRetry.retryAfter };
    const state = await getPipelineState<{ attempts?: Record<string, number> }>(slug);
    if (state) await savePipelineState(slug, { ...state, attempts: {} });
    trip = await updateTrip(slug, { status: "paid", errorMessage: undefined });
  }

  if (await isGenerationRunning(slug)) return done(false);

  const lastUpdate = Date.parse(trip.progress?.updatedAt ?? trip.updatedAt);
  const stalled = trip.status === "paid" || Date.now() - lastUpdate > STALE_MS;
  if (!stalled) return done(false);

  const stage = await pipelineNextStage(slug);
  after(() => runPipeline(slug, stage));
  return done(true);
}
