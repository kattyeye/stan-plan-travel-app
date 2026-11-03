import { NextRequest, NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";

/**
 * Public status endpoint for the waiting screen. Returns only what that screen
 * needs — never the email address or the raw wizard answers.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const trip = await getTripBySlug(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  return NextResponse.json(
    {
      slug: trip.slug,
      status: trip.status,
      tripNickname: trip.tripNickname,
      destination: trip.wizardData.destination,
      progress: trip.progress ?? null,
      errorMessage: trip.status === "error" ? trip.errorMessage ?? "Something went wrong." : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
