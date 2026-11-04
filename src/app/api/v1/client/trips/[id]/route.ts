import { NextRequest } from "next/server";
import { fail, ok, preflight } from "@/lib/api/client";
import { getTripBySlug } from "@/lib/db";
import { tripStatusView } from "@/lib/trips/start";

export const OPTIONS = preflight;

/**
 * GET /api/v1/client/trips/{id} — status and progress; once status is "ready",
 * `plan` holds the full trip (itinerary, recipes, grocery list, restaurants,
 * activities, packing). Pass ?plan=false to skip the plan while polling.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let trip;
  try {
    trip = await getTripBySlug(id);
  } catch (err) {
    console.error("client trip status error:", err);
    return fail(req, 503, "storage_unavailable", "Trip status is temporarily unavailable. Please retry shortly.");
  }
  if (!trip) return fail(req, 404, "not_found", "Trip not found");
  const includePlan = req.nextUrl.searchParams.get("plan") !== "false";
  return ok(
    req,
    { trip: tripStatusView(trip), plan: includePlan && trip.status === "ready" ? trip.generatedData ?? null : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
