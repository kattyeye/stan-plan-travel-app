import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/security";

/** OpenAPI 3.1 description of the client and partner APIs. */
export function GET(req: NextRequest) {
  const origin = appOrigin(req);
  const tripInput = {
    type: "object",
    required: ["destination", "startDate", "endDate"],
    properties: {
      destination: { type: "string", example: "Nags Head, NC" },
      startDate: { type: "string", format: "date" },
      endDate: { type: "string", format: "date" },
      numAdults: { type: "integer", minimum: 1, default: 2 },
      numKids: { type: "integer", minimum: 0, default: 0 },
      kidAges: { type: "array", items: { type: "integer" } },
      email: { type: "string", format: "email", description: "Guest email for the ready notification (optional for partner-billed trips)" },
      tripNickname: { type: "string" },
      tripType: { type: "string", example: "beach house" },
      planningStyle: { type: "string", enum: ["structured", "balanced", "flexible"], default: "balanced" },
      budget: { type: "string", enum: ["budget", "moderate", "splurge"], default: "moderate" },
      vibes: { type: "array", items: { type: "string", enum: ["laid-back", "adventurous", "foodie", "nature", "cultural", "family-fun", "nightlife", "live-music"] } },
      travelMethod: { type: "string", enum: ["car", "plane", "train", "other"], default: "car" },
      cookInRatio: { type: "string", enum: ["mostly-in", "mix", "mostly-out"], default: "mix" },
      dietaryRestrictions: { type: "array", items: { type: "string" }, example: ["vegetarian", "peanut allergy"] },
      cuisinePreferences: { type: "array", items: { type: "string" } },
    },
  };
  const property = {
    type: "object",
    description: "Irie's native listing shape (listingFormat: irie).",
    properties: {
      externalId: { type: "string" },
      name: { type: "string" },
      url: { type: "string", format: "uri" },
      address: { type: "string" },
      lat: { type: "number" },
      lng: { type: "number" },
      checkInTime: { type: "string", example: "16:00" },
      checkOutTime: { type: "string", example: "10:00" },
      maxGuests: { type: "integer" },
      bedrooms: { type: "integer" },
      kitchen: { type: "string", enum: ["full", "kitchenette", "none"] },
      amenities: { type: "array", items: { type: "string" } },
      houseRules: { type: "array", items: { type: "string" } },
      description: { type: "string" },
    },
  };
  const trip = {
    type: "object",
    properties: {
      object: { const: "trip" },
      id: { type: "string" },
      status: { type: "string", enum: ["awaiting_payment", "queued", "generating", "ready", "error"] },
      externalRef: { type: ["string", "null"] },
      progress: { type: ["object", "null"], properties: { stage: { type: "string" }, percent: { type: "number" }, message: { type: "string" } } },
      urls: { type: "object", properties: { trip: { type: "string" }, download: { type: "string" }, api: { type: "string" } } },
      quality: {
        type: ["object", "null"],
        description: "How many venues were confirmed open with Google Places, and when.",
      },
      plan: { type: ["object", "null"], description: "The full GeneratedTrip once status is ready." },
    },
  };
  const error = { type: "object", properties: { error: { type: "object", properties: { type: { type: "string" }, message: { type: "string" } } } } };

  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Irie API",
      version: "1.0.0",
      description:
        "Two surfaces. **Client API** (`/api/v1/client/*`, tag `client`): public, no key, CORS-enabled — for Irie's own mobile apps and browser extensions; a trip's unguessable id is its access capability. **Partner API** (`/api/v1/trips*`, tag `partner`): for booking platforms, authenticated with `Authorization: Bearer irie_live_…`; webhooks are signed `Irie-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, \"<t>.<body>\")>`. Errors use `{ error: { type, message } }`.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
      schemas: { TripInput: tripInput, Property: property, Trip: trip, Error: error },
    },
    security: [{ bearer: [] }],
    tags: [
      { name: "client", description: "Public API for Irie's mobile apps and browser extensions (docs/CLIENT_API.md)" },
      { name: "partner", description: "Authenticated API for booking platforms (docs/PARTNER_API.md)" },
    ],
    paths: {
      "/api/v1/client/config": {
        get: { tags: ["client"], security: [], summary: "Wizard options, limits and pricing", responses: { "200": { description: "Config" } } },
      },
      "/api/v1/client/places": {
        get: {
          tags: ["client"],
          security: [],
          summary: "Destination autocomplete",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } },
            { name: "session", in: "query", schema: { type: "string" }, description: "One id per search session (improves billing on Google)" },
          ],
          responses: { "200": { description: "{ suggestions: [{ id, label, mainText, secondaryText }] }" }, "429": { description: "Rate limited" } },
        },
      },
      "/api/v1/client/suggestions": {
        get: {
          tags: ["client"],
          security: [],
          summary: "Options that suit a destination",
          parameters: [
            { name: "destination", in: "query", required: true, schema: { type: "string" } },
            { name: "kids", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: { "200": { description: "{ tripTypes, vibes, cuisines, amenities }" } },
        },
      },
      "/api/v1/client/trips": {
        post: {
          tags: ["client"],
          security: [],
          summary: "Create a trip (first plan per email is free; otherwise returns a Stripe checkoutUrl)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["trip"],
                  properties: { trip: { allOf: [{ $ref: "#/components/schemas/TripInput" }], required: ["destination", "startDate", "endDate", "email"] }, draftId: { type: "string" } },
                },
              },
            },
          },
          responses: {
            "201": { description: "{ id, payment: free|checkout, checkoutUrl, urls: { web, api, download } }" },
            "400": { description: "invalid_request (with fields)" },
            "402": { description: "payment_required — free plan used and payments not enabled" },
            "429": { description: "rate_limited" },
            "503": { description: "storage_unavailable" },
          },
        },
      },
      "/api/v1/client/trips/{id}": {
        get: {
          tags: ["client"],
          security: [],
          summary: "Status, progress, and the full plan once ready",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            { name: "plan", in: "query", schema: { type: "boolean", default: true } },
          ],
          responses: { "200": { description: "{ trip: { id, status, progress, … }, plan: GeneratedTrip | null }" }, "404": { description: "not_found" } },
        },
      },
      "/api/v1/client/trips/{id}/resume": {
        post: {
          tags: ["client"],
          security: [],
          summary: "Restart a stalled build, or retry after an error ({ retry: true })",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "{ status, progress, started }" } },
        },
      },
      "/api/v1/client/trips/{id}/download": {
        get: {
          tags: ["client"],
          security: [],
          summary: "Offline HTML copy of the plan",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "text/html attachment" }, "404": { description: "Not found or not ready" } },
        },
      },
      "/api/v1/trips": {
        post: {
          tags: ["partner"],
          summary: "Create a trip (generate now) or a prefilled wizard link for the guest",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["trip"],
                  properties: {
                    mode: { type: "string", enum: ["generate", "prefill"], description: "Defaults to generate for partner-billed accounts, prefill otherwise." },
                    externalRef: { type: "string", description: "Your reservation id, echoed in webhooks" },
                    listingFormat: { type: "string", enum: ["irie", "airbnb", "vrbo"], default: "irie" },
                    listing: { description: "Listing payload in the chosen format", oneOf: [{ $ref: "#/components/schemas/Property" }, { type: "object" }] },
                    trip: { $ref: "#/components/schemas/TripInput" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Trip created (mode generate) or draft created (mode prefill: `{ object: \"draft\", id, urls: { wizard } }`)",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Trip" } } },
            },
            "400": { description: "Invalid input", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Missing or invalid API key" },
            "429": { description: "Rate limited — see Retry-After" },
          },
        },
        get: {
          tags: ["partner"],
          summary: "List your recent trips",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", maximum: 100, default: 25 } }],
          responses: { "200": { description: "List of trips (without full plans)" } },
        },
      },
      "/api/v1/trips/{id}": {
        get: {
          tags: ["partner"],
          summary: "Get a trip's status, and its full plan once ready",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Trip", content: { "application/json": { schema: { $ref: "#/components/schemas/Trip" } } } },
            "404": { description: "Not found (or not yours)" },
          },
        },
      },
    },
    webhooks: {
      "trip.ready": { post: { summary: "Plan finished", requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Acknowledge" } } } },
      "trip.failed": { post: { summary: "Generation could not finish", requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "Acknowledge" } } } },
    },
  });
}
