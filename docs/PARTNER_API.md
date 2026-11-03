# Irie Partner API (v1)

For booking platforms and property managers (Airbnb, VRBO, direct-booking sites) who want to offer guests a personalised, verified plan for their stay.

Machine-readable spec: `GET /api/v1/openapi.json`

## Authentication

Every request carries a partner key:

```
Authorization: Bearer irie_live_…
```

Keys are created by an Irie admin in **/admin/trips → Create partner API key** (or `POST /api/admin/partners`). Only a hash of the key is stored; the key and webhook secret are shown once.

Each partner has a billing mode:

| Billing | What `POST /api/v1/trips` does by default |
|---|---|
| `partner` | Generates the plan immediately. You're invoiced; the guest never sees checkout. |
| `guest` | Returns a prefilled wizard link. The guest picks their preferences and pays. |

## Create a trip

`POST /api/v1/trips`

```json
{
  "mode": "generate",
  "externalRef": "HM8X2K4QZ",
  "listingFormat": "airbnb",
  "listing": {
    "id": 53412987,
    "name": "Oceanfront Cottage with Hot Tub",
    "lat": 35.957, "lng": -75.624,
    "person_capacity": 8, "bedrooms": 4,
    "amenities": ["Kitchen", "Hot tub", "BBQ grill", "Beach essentials"],
    "check_in_time": "16:00", "check_out_time": "10:00",
    "address": { "street": "4102 S Virginia Dare Trl", "city": "Nags Head", "state": "NC", "country": "US" }
  },
  "trip": {
    "destination": "Nags Head, NC",
    "startDate": "2027-07-10",
    "endDate": "2027-07-15",
    "numAdults": 4,
    "numKids": 2,
    "kidAges": [6, 9],
    "email": "guest@example.com",
    "planningStyle": "balanced",
    "cookInRatio": "mix",
    "dietaryRestrictions": ["vegetarian"]
  }
}
```

- `listingFormat`: `irie` (our native `Property` shape — see the OpenAPI spec), `airbnb`, or `vrbo`. The Airbnb/VRBO adapters (`src/lib/partners/adapters.ts`) map the field names those platforms use in listing exports; confirm your exact payload during onboarding and we'll extend the mapping.
- Listing data makes plans better: real check-in times shape arrival day, the kitchen and amenities shape recipes and packing, and coordinates keep venue lookups local.
- Everything except `destination`, `startDate` and `endDate` has a sensible default.

**Response `201` (mode `generate`)**

```json
{
  "object": "trip",
  "id": "a1b2c3d4e5f6",
  "status": "queued",
  "externalRef": "HM8X2K4QZ",
  "urls": {
    "trip": "https://…/trip/a1b2c3d4e5f6",
    "download": "https://…/api/trip/a1b2c3d4e5f6/download",
    "api": "https://…/api/v1/trips/a1b2c3d4e5f6"
  },
  "progress": null,
  "quality": null,
  "plan": null
}
```

**Response `201` (mode `prefill`)**

```json
{ "object": "draft", "id": "Qm9vS2luZ0lk", "urls": { "wizard": "https://…/wizard?draft=Qm9vS2luZ0lk" } }
```

Send the guest the wizard link (confirmation email, in-app message). Listing details stay server-side; the guest can't alter them. Drafts expire after 60 days.

### Lightweight deep links (no API call)

For a simple "Plan your stay with Irie" button, link straight to the wizard. Airbnb-style parameter names work:

```
/wizard?destination=Nags+Head,+NC&checkin=2027-07-10&checkout=2027-07-15&adults=4&children=2
```

## Get a trip

`GET /api/v1/trips/{id}` — returns the same object. When `status` is `ready`, `plan` holds the full `GeneratedTrip` (itinerary, recipes, grocery list, restaurants with verification data, activities, packing list) and `quality` summarises how many venues were confirmed open on Google Maps.

`GET /api/v1/trips?limit=25` lists your recent trips (without plans).

Statuses: `awaiting_payment` → `queued` → `generating` → `ready` (or `error`). Generation takes about 3–5 minutes.

## Webhooks

If your partner account has a webhook URL, we `POST` these events:

| Event | When |
|---|---|
| `trip.ready` | The plan is finished. `data.url` is the guest-facing link. |
| `trip.failed` | Generation couldn't finish after retries. We investigate and regenerate; you'll get `trip.ready` later. |

```json
{
  "id": "evt_9f2c…",
  "type": "trip.ready",
  "created": "2027-06-01T12:00:00.000Z",
  "data": { "tripId": "a1b2c3d4e5f6", "externalRef": "HM8X2K4QZ", "status": "ready", "url": "https://…/trip/a1b2c3d4e5f6" }
}
```

### Verifying signatures

Each request has `Irie-Signature: t=<unix seconds>,v1=<hex>` where `v1 = HMAC-SHA256(webhook_secret, "<t>.<raw body>")`. Reject requests older than 5 minutes.

```ts
import { createHmac, timingSafeEqual } from "crypto";

function verify(rawBody: string, header: string, secret: string) {
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}
```

Respond `2xx` quickly. Non-2xx responses are retried up to 3 times with backoff (4xx other than 429 are not retried).

## Errors and limits

Errors look like `{ "error": { "type": "invalid_request", "message": "…" } }` with HTTP `400`, `401`, `403`, `404` or `429`. Trip creation is limited to 120 per hour per partner; `429` responses include `Retry-After`.

## Data and accuracy

- Every restaurant, activity and store comes from live web research, then is checked against Google Places: permanently or temporarily closed places are removed, and meals are scheduled around real opening hours. Each venue carries a `verification` object (`verified`, `web-sourced`, or `unverified`, with `checkedAt`).
- Guest emails are used only to send the plan link. Trip links are unguessable and excluded from search engines.
