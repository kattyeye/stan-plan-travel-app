import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";
import { startTrip } from "@/lib/trips/start";

export const maxDuration = 300;

/**
 * Wizard submit (website). A guest's first plan is free and starts generating
 * immediately; later plans go through Stripe. Logic lives in lib/trips/start.ts,
 * shared with the client API.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = await rateLimit("checkout", ip, 8, 3600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = (await req.json().catch(() => null)) as { wizardData?: unknown; draftId?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const result = await startTrip({ wizardData: body.wizardData, draftId: body.draftId, ip, origin: new URL(req.url).origin });
  if (!result.ok) {
    return NextResponse.json({ error: result.message, fields: result.fields, reason: result.reason }, { status: result.status });
  }
  return NextResponse.json({ url: result.nextUrl, slug: result.slug, free: result.payment === "free" });
}
