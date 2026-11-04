import { NextRequest } from "next/server";
import { fail, ok, preflight, rateLimited } from "@/lib/api/client";
import { resumeTrip } from "@/lib/trips/resume";

export const maxDuration = 300;
export const OPTIONS = preflight;

/**
 * POST /api/v1/client/trips/{id}/resume — call every ~30s while waiting, and
 * with { "retry": true } when the user taps "Try again" after an error. Safe to
 * call repeatedly; it only restarts work that has stalled, never unpaid trips.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { sessionId?: string; retry?: boolean };
  const result = await resumeTrip(id, { sessionId: body.sessionId, retry: body.retry === true });
  if (result.kind === "not_found") return fail(req, 404, "not_found", "Trip not found");
  if (result.kind === "rate_limited") return rateLimited(req, result.retryAfter);
  return ok(req, { status: result.status, progress: result.progress, started: result.started }, { headers: { "Cache-Control": "no-store" } });
}
