import { NextRequest, NextResponse, after } from "next/server";
import { getPipelineState, getTripBySlug, savePipelineState, updateTrip, updateTripStripeSession } from "@/lib/db";
import { isGenerationRunning, pipelineNextStage, runPipeline } from "@/lib/pipeline";
import { rateLimit, tooManyRequests } from "@/lib/security";
import { stripeEnabled, verifyStripeSession } from "@/lib/stripe";

export const maxDuration = 300;

/** A stage that hasn't reported progress for this long is considered stalled. */
const STALE_MS = 45_000;

/**
 * Called by the waiting screen. Makes sure a paid trip is actually being
 * built, recovering from anything that can go wrong in between:
 *   - the Stripe webhook is late or misconfigured → verify the Checkout Session directly
 *   - a stage hand-off was lost or a function timed out → restart from the last checkpoint
 *   - the guest taps "Try again" after an error → reset retry counters and go again
 * It never starts generation for an unpaid trip.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const limit = await rateLimit("resume", slug, 20, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { sessionId?: string; retry?: boolean };
  let trip = await getTripBySlug(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const respond = (started: boolean) =>
    NextResponse.json({ status: trip!.status, progress: trip!.progress ?? null, started }, { headers: { "Cache-Control": "no-store" } });

  if (trip.status === "ready") return respond(false);

  if (trip.status === "pending") {
    if (!stripeEnabled() || !body.sessionId) return respond(false);
    let paid = false;
    try {
      paid = await verifyStripeSession(body.sessionId, slug);
    } catch (err) {
      console.error(`resume: could not verify session for ${slug}:`, err);
    }
    if (!paid) return respond(false);
    await updateTripStripeSession(slug, body.sessionId);
    trip = await updateTrip(slug, { status: "paid", billing: "stripe" });
  }

  if (trip.status === "error") {
    if (!body.retry) return respond(false);
    const limitRetry = await rateLimit("retry", slug, 3, 3600);
    if (!limitRetry.ok) return tooManyRequests(limitRetry.retryAfter);
    const state = await getPipelineState<{ attempts?: Record<string, number> }>(slug);
    if (state) await savePipelineState(slug, { ...state, attempts: {} });
    trip = await updateTrip(slug, { status: "paid", errorMessage: undefined });
  }

  if (await isGenerationRunning(slug)) return respond(false);

  const lastUpdate = Date.parse(trip.progress?.updatedAt ?? trip.updatedAt);
  const stalled = trip.status === "paid" || Date.now() - lastUpdate > STALE_MS;
  if (!stalled) return respond(false);

  const stage = await pipelineNextStage(slug);
  after(() => runPipeline(slug, stage));
  return respond(true);
}
