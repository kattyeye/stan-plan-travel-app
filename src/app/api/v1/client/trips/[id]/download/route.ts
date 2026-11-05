import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, fail, preflight } from "@/lib/api/client";
import { getTripBySlug } from "@/lib/db";
import { renderTripHtml } from "@/lib/export-html";
import { withEdits } from "@/lib/trips/edits";
import { appOrigin } from "@/lib/security";

export const OPTIONS = preflight;

/** GET /api/v1/client/trips/{id}/download — the plan as one offline HTML file (save for airplane mode). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await getTripBySlug(id);
  if (!trip || trip.status !== "ready" || !trip.generatedData) return fail(req, 404, "not_found", "Trip not found or not ready");
  const html = renderTripHtml(withEdits(trip.generatedData, trip.edits, { dropHidden: true }), { slug: id, url: `${appOrigin(req)}/trip/${id}` });
  return new NextResponse(html, {
    headers: {
      ...corsHeaders(req),
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="irie-${id}.html"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
