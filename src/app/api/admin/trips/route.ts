import { NextRequest, NextResponse } from "next/server";
import { listTrips } from "@/lib/db";
import { requireAdmin } from "@/lib/security";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0);
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50));
  try {
    const { trips, total } = await listTrips(offset, limit);
    return NextResponse.json({
      total,
      trips: trips.map((t) => ({
        slug: t.slug,
        tripNickname: t.tripNickname,
        email: t.email,
        status: t.status,
        billing: t.billing ?? null,
        partner: t.partner ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        progress: t.progress ?? null,
        errorMessage: t.errorMessage ?? null,
        destination: t.wizardData?.destination,
        startDate: t.wizardData?.startDate,
        endDate: t.wizardData?.endDate,
        quality: t.generatedData?.quality
          ? { venues: t.generatedData.quality.venues, issues: t.generatedData.quality.issues.length, errors: t.generatedData.quality.issues.filter((i) => i.severity === "error").length }
          : null,
      })),
    });
  } catch (error) {
    console.error("Admin trips error:", error);
    return NextResponse.json({ error: "Failed to load trips" }, { status: 500 });
  }
}
