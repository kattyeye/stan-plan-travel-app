import { NextResponse } from "next/server";
import { runGeneration } from "@/lib/generate";

export const maxDuration = 300;

/**
 * POST /api/v1/trips/[slug]/generate
 *
 * Idempotent: a Redis lock means concurrent callers never trigger two Claude
 * runs. Losing callers get `alreadyGenerating` and should poll GET
 * /api/v1/trips/[slug] instead.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const outcome = await runGeneration(slug);

  switch (outcome.status) {
    case "done":
      return NextResponse.json({ slug, status: "ready" });
    case "already-running":
      return NextResponse.json({ slug, status: "generating", alreadyGenerating: true });
    case "not-found":
      return NextResponse.json({ error: "Trip not found", slug }, { status: 404 });
    case "failed":
      return NextResponse.json({ error: "Generation failed", slug }, { status: 500 });
  }
}
