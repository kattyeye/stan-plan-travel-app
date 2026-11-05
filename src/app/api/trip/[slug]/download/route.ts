import { NextRequest, NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";
import { renderTripHtml } from "@/lib/export-html";
import { withEdits } from "@/lib/trips/edits";
import { appOrigin } from "@/lib/security";

/** Downloads the trip as a single offline HTML file. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip || trip.status !== "ready" || !trip.generatedData) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
  // The download matches what the group sees: swaps applied, skipped stops left out.
  const html = renderTripHtml(withEdits(trip.generatedData, trip.edits, { dropHidden: true }), { slug, url: `${appOrigin(req)}/trip/${slug}` });
  const filename = (trip.generatedData.meta.title || "irie-trip")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename || "irie-trip"}.html"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
