import { NextRequest } from "next/server";
import { fail, ok, preflight, rateLimited } from "@/lib/api/client";
import { appOrigin, clientIp, rateLimit } from "@/lib/security";
import { startTrip } from "@/lib/trips/start";

export const maxDuration = 300;
export const OPTIONS = preflight;

/**
 * POST /api/v1/client/trips — create a trip from wizard answers.
 * Body: { "trip": { destination, startDate, endDate, email, ... }, "draftId"?: string }
 *
 * 201 with payment "free": generation has started; poll GET /trips/{id}.
 * 201 with payment "checkout": open checkoutUrl (in-app browser); generation
 * starts when Stripe confirms payment — keep polling the same endpoint.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = await rateLimit("checkout", ip, 8, 3600);
  if (!limit.ok) return rateLimited(req, limit.retryAfter);

  const body = (await req.json().catch(() => null)) as { trip?: unknown; draftId?: unknown } | null;
  if (!body || typeof body.trip !== "object") return fail(req, 400, "invalid_request", 'Send JSON: { "trip": { … } }');

  const origin = appOrigin(req);
  const result = await startTrip({ wizardData: body.trip, draftId: body.draftId, ip, origin });
  if (!result.ok) {
    return fail(req, result.status, result.type, result.message, {
      ...(result.fields ? { fields: result.fields } : {}),
      ...(result.reason ? { reason: result.reason } : {}),
    });
  }
  return ok(
    req,
    {
      id: result.slug,
      payment: result.payment,
      checkoutUrl: result.payment === "checkout" ? result.nextUrl : null,
      urls: {
        web: `${origin}/trip/${result.slug}`,
        api: `${origin}/api/v1/client/trips/${result.slug}`,
        download: `${origin}/api/v1/client/trips/${result.slug}/download`,
      },
    },
    { status: 201 }
  );
}
