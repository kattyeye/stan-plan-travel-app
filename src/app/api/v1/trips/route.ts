import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { createTrip, listPartnerTrips } from "@/lib/db";
import { authenticatePartner } from "@/lib/partners";
import { compact, normalizeListing } from "@/lib/partners/adapters";
import { createDraft } from "@/lib/partners/drafts";
import { runPipeline } from "@/lib/pipeline";
import { appOrigin, rateLimit, tooManyRequests } from "@/lib/security";
import { generateSlug } from "@/lib/slug";
import { PropertyContextSchema, parseWizardData } from "@/lib/validation";
import { publicTrip } from "./serialize";

export const maxDuration = 300;

/** Wizard fields a partner may prefill for the guest (validated again at checkout). */
const DRAFT_FIELDS = new Set([
  "destination", "startDate", "endDate", "tripType", "numAdults", "numKids", "kidAges", "planningStyle", "budget",
  "vibes", "travelMethod", "cookInRatio", "dietaryRestrictions", "cuisinePreferences", "email", "tripNickname",
]);

const unauthorized = () =>
  NextResponse.json({ error: { type: "unauthorized", message: "Provide a valid partner API key: Authorization: Bearer irie_live_…" } }, { status: 401 });

const CreateBody = z.object({
  /** "generate": build the plan now (partner-billed). "prefill": return a wizard link for the guest to finish and pay. */
  mode: z.enum(["generate", "prefill"]).optional(),
  externalRef: z.string().trim().max(120).optional(),
  listingFormat: z.enum(["irie", "airbnb", "vrbo"]).default("irie"),
  listing: z.unknown().optional(),
  trip: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/v1/trips — create a trip for a guest's stay.
 * See docs/PARTNER_API.md and GET /api/v1/openapi.json.
 */
export async function POST(req: NextRequest) {
  const partner = await authenticatePartner(req);
  if (!partner) return unauthorized();
  const limit = await rateLimit("v1-create", partner.id, 120, 3600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = CreateBody.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: { type: "invalid_request", message: body.error.issues[0]?.message ?? "Invalid body" } }, { status: 400 });
  }
  const { externalRef, listingFormat, listing, trip } = body.data;
  const mode = body.data.mode ?? (partner.billing === "partner" ? "generate" : "prefill");
  if (mode === "generate" && partner.billing !== "partner") {
    return NextResponse.json(
      { error: { type: "forbidden", message: "This partner account is guest-billed; use mode \"prefill\" so the guest can pay." } },
      { status: 403 }
    );
  }

  let property;
  if (listing !== undefined) {
    const candidate = normalizeListing(listingFormat, listing);
    const parsed = PropertyContextSchema.safeParse(candidate ? compact(candidate) : undefined);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      return NextResponse.json({ error: { type: "invalid_request", message: `listing.${i?.path.join(".")}: ${i?.message}` } }, { status: 400 });
    }
    property = parsed.data;
  }
  const partnerRef = { partnerId: partner.id, externalRef };
  const origin = appOrigin(req);

  if (mode === "prefill") {
    const wizard = Object.fromEntries(Object.entries(trip).filter(([k]) => DRAFT_FIELDS.has(k)));
    const draft = await createDraft({ wizard, property, partner: partnerRef });
    return NextResponse.json(
      { object: "draft", id: draft.id, urls: { wizard: `${origin}/wizard?draft=${draft.id}` } },
      { status: 201 }
    );
  }

  const parsed = parseWizardData(
    {
      tripNickname: property?.name,
      propertyAmenities: property?.amenities ?? [],
      ...trip,
      property,
    },
    { requireEmail: false }
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: { type: "invalid_request", message: parsed.error, fields: parsed.fields } }, { status: 400 });
  }

  const slug = generateSlug();
  const record = await createTrip({
    slug,
    email: parsed.data.email,
    tripNickname: parsed.data.tripNickname,
    wizardData: { ...parsed.data, partner: partnerRef },
    status: "paid",
    billing: "partner",
    partner: partnerRef,
  });
  after(() => runPipeline(slug, "research"));
  return NextResponse.json(publicTrip(record, origin), { status: 201 });
}

/** GET /api/v1/trips — this partner's most recent trips. */
export async function GET(req: NextRequest) {
  const partner = await authenticatePartner(req);
  if (!partner) return unauthorized();
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 25) || 25));
  const trips = await listPartnerTrips(partner.id, limit);
  const origin = appOrigin(req);
  return NextResponse.json({ object: "list", data: trips.map((t) => publicTrip(t, origin, { includePlan: false })) });
}
