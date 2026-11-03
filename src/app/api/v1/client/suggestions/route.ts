import { NextRequest } from "next/server";
import { fail, ok, preflight, rateLimited } from "@/lib/api/client";
import { clientIp, rateLimit } from "@/lib/security";
import { suggestForDestination } from "@/lib/suggest";

export const OPTIONS = preflight;

/** GET /api/v1/client/suggestions?destination=Corfu,+Greece&kids=2 — which options fit this place. */
export async function GET(req: NextRequest) {
  const destination = (req.nextUrl.searchParams.get("destination") ?? "").trim();
  if (destination.length < 2) return fail(req, 400, "invalid_request", "destination is required");
  const limit = await rateLimit("suggest", clientIp(req), 30, 600);
  if (!limit.ok) return rateLimited(req, limit.retryAfter);
  const kids = Math.max(0, Number(req.nextUrl.searchParams.get("kids") ?? 0) || 0);
  try {
    return ok(req, await suggestForDestination(destination, kids));
  } catch (err) {
    console.error("client suggestions error:", err);
    return fail(req, 500, "server_error", "Couldn't load suggestions — the app should fall back to the full option lists.");
  }
}
