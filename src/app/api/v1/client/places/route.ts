import { NextRequest } from "next/server";
import { ok, preflight, rateLimited } from "@/lib/api/client";
import { autocompleteCached } from "@/lib/geocode";
import { clientIp, rateLimit } from "@/lib/security";

export const OPTIONS = preflight;

/** GET /api/v1/client/places?q=corf[&session=uuid] — destination autocomplete. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return ok(req, { suggestions: [] });
  const limit = await rateLimit("autocomplete", clientIp(req), 60, 60);
  if (!limit.ok) return rateLimited(req, limit.retryAfter);
  const { suggestions, degraded } = await autocompleteCached(q, req.nextUrl.searchParams.get("session") ?? undefined);
  return ok(req, { suggestions, ...(degraded ? { degraded } : {}) }, degraded ? {} : { headers: { "Cache-Control": "public, max-age=3600" } });
}
