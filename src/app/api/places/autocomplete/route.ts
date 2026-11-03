import { NextRequest, NextResponse } from "next/server";
import { autocompleteCached } from "@/lib/geocode";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";

/** GET /api/places/autocomplete?q=corf — destination suggestions for the website. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ suggestions: [] });
  const limit = await rateLimit("autocomplete", clientIp(req), 60, 60);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const result = await autocompleteCached(q, req.nextUrl.searchParams.get("session") ?? undefined);
  return NextResponse.json(result, { headers: result.degraded ? {} : { "Cache-Control": "public, max-age=3600" } });
}
