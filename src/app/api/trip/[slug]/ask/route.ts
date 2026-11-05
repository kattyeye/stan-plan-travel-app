import { NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";
import { interpretQuery } from "@/lib/trip-ask";
import { withEdits } from "@/lib/trips/edits";

export const runtime = "nodejs";

/** Command bar: interprets a free-form question as a filter over this trip's plan. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const limit = await rateLimit("ask", clientIp(req), 20, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as { query?: unknown; today?: unknown };
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : undefined;
  if (query.length < 2 || query.length > 200) return NextResponse.json({ error: "Ask in 2–200 characters." }, { status: 400 });

  const trip = await getTripBySlug(slug);
  if (!trip || trip.status !== "ready" || !trip.generatedData) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  try {
    const filter = await interpretQuery(slug, withEdits(trip.generatedData, trip.edits), query, today);
    return NextResponse.json({ filter });
  } catch (err) {
    console.error("ask route error:", err);
    return NextResponse.json({ error: "ask_failed" }, { status: 502 });
  }
}
