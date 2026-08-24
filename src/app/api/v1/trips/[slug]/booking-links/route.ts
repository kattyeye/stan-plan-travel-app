import { NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";
import { getAffiliateConfig } from "@/lib/affiliates";
import { buildStayLinks } from "@/core/partners";

/**
 * GET /api/v1/trips/[slug]/booking-links
 *
 * Prefilled lodging search URLs for this trip's destination, dates and group.
 * Built server-side so affiliate ids stay out of the client bundle.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const wizard = trip.wizardData;
  const links = buildStayLinks(
    {
      destination: wizard.destination,
      checkIn: wizard.startDate,
      checkOut: wizard.endDate,
      adults: wizard.numAdults ?? 2,
      children: wizard.numKids ?? 0,
      bedrooms: wizard.bedrooms,
    },
    getAffiliateConfig(),
  );

  return NextResponse.json({ slug, destination: wizard.destination, links });
}
