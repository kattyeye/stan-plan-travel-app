import { NextRequest, NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const trip = await getTripBySlug(slug);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // Only expose generatedData once ready — never expose partial state
  return NextResponse.json({
    slug: trip.slug,
    status: trip.status,
    tripNickname: trip.tripNickname,
    destination: trip.wizardData.destination,
    // Expose wizardData when pending or error (generating page + admin regenerate need it)
    wizardData: (trip.status === "pending" || trip.status === "error") ? trip.wizardData : undefined,
    generatedData: trip.status === "ready" ? trip.generatedData : undefined,
  });
}
