import { NextRequest, NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";
import { normalizeTrip } from "@/core/normalize";
import { buildTripEvents, toICS } from "@/core/calendar";

/**
 * GET /api/v1/trips/[slug]/calendar.ics
 *
 * Returns the trip as an iCalendar file. iOS opens it in Calendar, Android in
 * Google Calendar, desktop in Outlook/Calendar — one file covers every target,
 * which is why this is a download rather than a per-provider integration.
 *
 * Query params:
 *   include=all | activities | meals   (default: all)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let trip;
  try {
    trip = await getTripBySlug(slug);
  } catch (error) {
    console.error("calendar: storage unavailable:", error);
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }

  if (!trip || trip.status !== "ready" || !trip.generatedData) {
    return NextResponse.json({ error: "Trip not found or not ready" }, { status: 404 });
  }

  const include = req.nextUrl.searchParams.get("include") ?? "all";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  const normalized = normalizeTrip(trip.generatedData);
  const events = buildTripEvents(normalized, {
    tripId: slug,
    activities: include === "all" || include === "activities",
    meals: include === "all" || include === "meals",
    tripUrl: `${appUrl}/trip/${slug}`,
  });

  if (events.length === 0) {
    // Almost always means the generator emitted non-ISO dates, so nothing can
    // be placed on a calendar. Say so rather than serving an empty file.
    return NextResponse.json(
      { error: "This trip has no schedulable dates", slug },
      { status: 422 },
    );
  }

  const calendarName = trip.tripNickname || normalized.meta?.title || "Irie Trip";
  const ics = toICS(events, { calendarName });

  const safeName = (trip.tripNickname || slug).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
