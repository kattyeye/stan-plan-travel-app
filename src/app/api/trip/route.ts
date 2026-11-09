import { NextRequest, NextResponse } from "next/server";
import { getTripBySlug } from "@/lib/db";
import { emailEnabled, maskEmail } from "@/lib/notify";

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
      // Lets the waiting page promise an email only when one will actually be sent.
      emailEnabled: emailEnabled() && !!trip.email,
      emailTo: emailEnabled() && trip.email ? maskEmail(trip.email) : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
