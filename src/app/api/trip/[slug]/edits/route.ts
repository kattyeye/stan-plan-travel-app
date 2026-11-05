import { NextResponse } from "next/server";
import { acquireLock, getTripBySlug, releaseLock, updateTrip } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";
import { applyEditOp, emptyEdits, parseEditOp } from "@/lib/trips/edits";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

/** The travel group's current changes to the plan. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip || trip.status !== "ready") return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json({ edits: trip.edits ?? emptyEdits(trip.updatedAt) }, { headers: noStore });
}

/**
 * Applies one change (swap, skip, done, report, reset). The link is the
 * credential, as for viewing; every op is validated against the original
 * plan, and swaps can only pick researched places.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limit = await rateLimit("trip-edit", clientIp(req), 60, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as { op?: unknown } | null;
  const op = parseEditOp(body?.op);
  if (!op) return NextResponse.json({ error: "That change isn't valid." }, { status: 400 });

  // Serialise writers on this trip so two people's changes never overwrite each other.
  let token: string | null = null;
  for (let i = 0; i < 10 && !token; i++) {
    token = await acquireLock(`edit:${slug}`, 5);
    if (!token) await new Promise((r) => setTimeout(r, 100));
  }
  if (!token) return NextResponse.json({ error: "Someone else is saving a change. Try again in a moment." }, { status: 503 });

  try {
    const trip = await getTripBySlug(slug);
    if (!trip || trip.status !== "ready" || !trip.generatedData) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    const result = applyEditOp(trip.generatedData, trip.edits, op);
    if (!result.ok) return NextResponse.json({ error: result.error, edits: trip.edits ?? emptyEdits(trip.updatedAt) }, { status: 422 });
    await updateTrip(slug, { edits: result.edits });
    return NextResponse.json({ edits: result.edits }, { headers: noStore });
  } finally {
    await releaseLock(`edit:${slug}`, token);
  }
}
