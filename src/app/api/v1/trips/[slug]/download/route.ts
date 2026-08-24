import { NextResponse } from "next/server";
import { getTripBySlug, getTripHtml } from "@/lib/db";

/**
 * GET /api/v1/trips/[slug]/download
 *
 * Serves the self-contained HTML rendering that generation already produced
 * and stored. It was being generated and saved but never exposed to customers.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let trip;
  try {
    trip = await getTripBySlug(slug);
  } catch (error) {
    console.error("download: storage unavailable:", error);
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }

  if (!trip || trip.status !== "ready") {
    return NextResponse.json({ error: "Trip not found or not ready" }, { status: 404 });
  }

  const html = await getTripHtml(slug);
  if (!html) {
    return NextResponse.json({ error: "No downloadable file for this trip" }, { status: 404 });
  }

  const safeName = (trip.tripNickname || slug).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName || slug}.html"`,
    },
  });
}
