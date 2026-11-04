import { NextRequest } from "next/server";
import { CLIENT_API_VERSION, ok, preflight } from "@/lib/api/client";
import { freePlanEnabled } from "@/lib/billing";
import {
  AMENITIES, BUDGET, COOK_RATIO, CUISINES, DEFAULT_SECTIONS, DIETARY, PLANNING, SECTIONS, TRAVEL, TRIP_TYPES, VIBES,
} from "@/lib/options";
import { PRICE_CENTS, stripeEnabled } from "@/lib/stripe";
import { MAX_NIGHTS } from "@/lib/validation";

export const OPTIONS = preflight;

/**
 * GET /api/v1/client/config — everything an app needs to render the trip
 * wizard: option lists, limits and pricing. Cache it for an hour.
 */
export function GET(req: NextRequest) {
  return ok(
    req,
    {
      apiVersion: CLIENT_API_VERSION,
      pricing: {
        currency: "usd",
        priceCents: PRICE_CENTS,
        firstPlanFree: freePlanEnabled(),
        paymentsEnabled: stripeEnabled(),
      },
      limits: { maxNights: MAX_NIGHTS, maxAdults: 20, maxKids: 15, maxKidAge: 17 },
      options: {
        tripTypes: TRIP_TYPES,
        vibes: VIBES,
        planningStyles: PLANNING,
        budgets: BUDGET,
        travelMethods: TRAVEL,
        cookInRatios: COOK_RATIO,
        dietary: DIETARY,
        cuisines: CUISINES,
        amenities: AMENITIES,
        sections: SECTIONS,
        defaultSections: DEFAULT_SECTIONS,
      },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
