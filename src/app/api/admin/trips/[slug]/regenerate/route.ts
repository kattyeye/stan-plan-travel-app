import { NextRequest, NextResponse, after } from "next/server";
import { getTripBySlug, updateTrip } from "@/lib/db";
import { isGenerationRunning, resetPipeline, runPipeline } from "@/lib/pipeline";
import { requireAdmin } from "@/lib/security";

export const maxDuration = 300;

/** Rebuilds a trip from scratch (fresh research included). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (await isGenerationRunning(slug)) return NextResponse.json({ error: "Generation already running" }, { status: 409 });

  await resetPipeline(slug);
  await updateTrip(slug, {
    status: "paid",
    errorMessage: undefined,
    progress: { stage: "queued", message: "Queued", percent: 2, updatedAt: new Date().toISOString(), startedAt: new Date().toISOString() },
  });
  after(() => runPipeline(slug, "research"));
  return NextResponse.json({ ok: true, slug });
}
