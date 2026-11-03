import { NextRequest, NextResponse, after } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { isInternalRequest } from "@/lib/security";
import type { PipelineStage } from "@/types/trip";

export const maxDuration = 300;

const STAGES: PipelineStage[] = ["research", "plan", "recipes", "finalize"];

/**
 * Stage hand-off between pipeline invocations. Each call gets its own function
 * time budget. Authenticated with the internal secret; never exposed to users.
 */
export async function POST(req: NextRequest) {
  if (!isInternalRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, stage } = (await req.json().catch(() => ({}))) as { slug?: string; stage?: PipelineStage };
  if (!slug || !stage || !STAGES.includes(stage)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  after(() => runPipeline(slug, stage));
  return NextResponse.json({ accepted: true }, { status: 202 });
}
