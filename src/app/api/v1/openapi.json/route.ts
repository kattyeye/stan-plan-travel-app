import { NextRequest, NextResponse } from "next/server";
import { appOrigin } from "@/lib/security";

/** OpenAPI 3.1 description of the partner API. */
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
      title: "Irie Partner API",
      version: "1.0.0",
      description:
        "Create personalised, verified trip plans for guests of a booked stay. Authenticate with `Authorization: Bearer irie_live_…`. Webhooks are signed: `Irie-Signature: t=<unix>,v1=<hex HMAC-SHA256(secret, \"<t>.<body>\")>`.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
      schemas: { TripInput: tripInput, Property: property, Trip: trip, Error: error },
    },
    security: [{ bearer: [] }],
    paths: {
      "/api/v1/trips": {
        post: {
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
          summary: "List your recent trips",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", maximum: 100, default: 25 } }],
          responses: { "200": { description: "List of trips (without full plans)" } },
        },
      },
      "/api/v1/trips/{id}": {
        get: {
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
