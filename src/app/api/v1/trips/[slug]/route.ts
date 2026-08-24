import { NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";
import { normalizeTrip } from "@/core/normalize";

/**
 * GET /api/v1/trips/[slug]
 *
 * Status plus, once ready, the generated plan — already normalized, so clients
 * never have to deal with legacy prose activities.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  return NextResponse.json({
    slug: trip.slug,
    status: trip.status,
    tripNickname: trip.tripNickname,
    destination: trip.wizardData?.destination,
    createdAt: trip.createdAt,
    // Only exposed before generation succeeds — the generating screen and the
    // admin regenerate flow need it; a finished trip doesn't.
    wizardData: trip.status === "pending" || trip.status === "error" ? trip.wizardData : undefined,
    trip: trip.status === "ready" && trip.generatedData ? normalizeTrip(trip.generatedData) : undefined,
  });
}
