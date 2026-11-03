import { NextRequest, NextResponse } from "next/server";
import { tooManyRequests } from "@/lib/security";
import { resumeTrip } from "@/lib/trips/resume";

export const maxDuration = 300;

/** Website waiting page: make sure a paid trip is being built (see lib/trips/resume.ts). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as { sessionId?: string; retry?: boolean };
  const result = await resumeTrip(slug, { sessionId: body.sessionId, retry: body.retry });
  if (result.kind === "not_found") return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (result.kind === "rate_limited") return tooManyRequests(result.retryAfter);
  return NextResponse.json({ status: result.status, progress: result.progress, started: result.started }, { headers: { "Cache-Control": "no-store" } });
}
