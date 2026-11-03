import { NextRequest, NextResponse } from "next/server";
import { getPipelineState, getTripBySlug } from "@/lib/db";
import { requireAdmin } from "@/lib/security";

/** Full record for support: quality report, pipeline checkpoint status and last error. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const { slug } = await params;
  const trip = await getTripBySlug(slug);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pipeline = await getPipelineState<Record<string, unknown>>(slug);
  return NextResponse.json({
    trip: { ...trip, htmlBlob: undefined },
    pipeline: pipeline
      ? {
          stagesDone: ["research", "plan", "recipes"].filter((k) => k in pipeline && pipeline[k]),
          attempts: pipeline.attempts,
          usage: pipeline.usage,
          models: pipeline.models,
          lastError: pipeline.lastError ?? null,
        }
      : null,
  });
}
