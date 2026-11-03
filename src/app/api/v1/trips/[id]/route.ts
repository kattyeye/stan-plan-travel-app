import { NextRequest, NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";
import { authenticatePartner } from "@/lib/partners";
import { appOrigin } from "@/lib/security";
import { publicTrip } from "../serialize";

/** GET /api/v1/trips/:id — status, and the full plan once ready. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const partner = await authenticatePartner(req);
  if (!partner) return NextResponse.json({ error: { type: "unauthorized", message: "Invalid API key" } }, { status: 401 });
  const { id } = await params;
  const trip = await getTripBySlug(id);
  // Partners only ever see their own trips; anything else is a 404.
  if (!trip || trip.partner?.partnerId !== partner.id) {
    return NextResponse.json({ error: { type: "not_found", message: "Trip not found" } }, { status: 404 });
  }
  return NextResponse.json(publicTrip(trip, appOrigin(req)), { headers: { "Cache-Control": "no-store" } });
}
