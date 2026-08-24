# Irie v1 API

The JSON API behind the web app, and the contract a mobile (React Native /
Expo) client builds against.

Base URL: `https://your-domain` (or `http://localhost:3000` in dev).
All request and response bodies are JSON unless noted.

> **Use the typed client rather than raw fetch.** `src/core/api-client.ts` wraps
> every endpoint below, has no web dependencies, and can be copied into a React
> Native app as-is:
>
> ```ts
> import { createIrieClient } from "@/core/api-client";
> const irie = createIrieClient({ baseUrl: "https://your-domain" });
> const { slug, url } = await irie.createTrip({ wizardData });
> ```

## Authentication

There is none. Trips are addressed by an unguessable 12-character hex slug and
are readable by anyone holding the link — that is deliberate, since a plan is
meant to be shared with a travel group. Do not put anything sensitive in a trip.

`/api/admin/*` has **no authentication either** and should be put behind
network or platform-level protection before this is exposed publicly.

---

## Trip lifecycle

```
POST /api/v1/trips              → { slug, url }   create + get checkout URL
   ↓  user pays at `url`
Stripe webhook                  → marks paid, starts generation
   ↓
GET  /api/v1/trips/{slug}       → poll until status === "ready"
   ↓
GET  /api/v1/trips/{slug}/calendar.ics
GET  /api/v1/trips/{slug}/booking-links
```

`status` is one of `pending` · `paid` · `generating` · `ready` · `error`.

---

## Endpoints

### `POST /api/v1/trips`

Create a trip and get somewhere to send the customer.

```jsonc
// request
{
  "wizardData": { "destination": "Nassau, Bahamas", "startDate": "2026-08-14",
                  "endDate": "2026-08-18", "numAdults": 2, "email": "a@b.com" },
  "referralCode": "travelwithsam"   // optional; web uses a cookie instead
}
// 201
{ "slug": "a1b2c3d4e5f6", "url": "https://checkout.stripe.com/..." }
```

Only five fields are required — `destination`, `startDate`, `endDate`,
`numAdults`, `email`. Everything else is defaulted by
`applyDefaults()` in `src/core/wizard-machine.ts`.

`400` returns which fields are missing:
`{ "error": "Missing required fields", "missing": ["startDate", "email"] }`

With no `STRIPE_SECRET_KEY` configured, `url` points at the generating page
instead of Stripe, so local dev works without payment.

### `GET /api/v1/trips/{slug}`

Status, and the plan once ready.

```jsonc
{
  "slug": "a1b2c3d4e5f6",
  "status": "ready",
  "tripNickname": "Bahamas 2026",
  "destination": "Nassau, Bahamas",
  "createdAt": "2026-08-01T12:00:00.000Z",
  "trip": { /* NormalizedTrip — only when status is "ready" */ }
}
```

`trip` is **normalized**: activities are always objects with optional
`startTime`, and every meal has a `time`. Clients never see the legacy prose
format. `wizardData` is returned only while `status` is `pending` or `error`.

Poll roughly every 5s while generating. Generation is two Claude calls and
normally lands in 1–2 minutes.

### `POST /api/v1/trips/{slug}/generate`

Start generation. **Idempotent** — a Redis lock means concurrent callers never
trigger two Claude runs.

```jsonc
{ "slug": "...", "status": "ready" }
{ "slug": "...", "status": "generating", "alreadyGenerating": true }  // someone else won
```

On `alreadyGenerating`, don't retry — poll `GET /api/v1/trips/{slug}`.

### `GET /api/v1/trips/{slug}/calendar.ics`

The trip as an iCalendar file (`text/calendar`, sent as an attachment).

| Query | Values | Default |
| --- | --- | --- |
| `include` | `all` · `activities` · `meals` | `all` |

Times are **floating** — `DTSTART:20260814T090000` with no `Z` and no `TZID`,
meaning "09:00 wherever you are", which is what you want for a travel
itinerary. Untimed activities (normal for `flexible` trips) become one all-day
event per day. UIDs are stable, so re-importing updates rather than duplicates.

`422` when the trip has no schedulable dates.

> **On React Native, don't fetch this.** Import `buildTripEvents()` from
> `src/core/calendar.ts` and hand the events to `expo-calendar` — no download
> and no server round trip. `toICS()` is only needed for a file.

### `GET /api/v1/trips/{slug}/download`

The self-contained HTML rendering (`text/html`, as an attachment). `404` if the
trip has no stored HTML.

### `GET /api/v1/trips/{slug}/booking-links`

Prefilled lodging searches for the trip's destination, dates and group.

```jsonc
{
  "slug": "...", "destination": "Nassau, Bahamas",
  "links": [
    { "id": "airbnb",  "label": "Airbnb", "note": "Whole homes and private rooms",
      "url": "https://www.airbnb.com/s/...", "earns": false },
    { "id": "booking", "label": "Booking.com", "note": "Hotels plus apartments",
      "url": "https://www.booking.com/searchresults.html?...", "earns": true }
  ]
}
```

`earns` says whether that link carries an affiliate id that actually pays —
surface it honestly in the UI. Built server-side so affiliate ids stay out of
client bundles.

### `POST /api/v1/parse-intent`

Natural-language trip intake.

```jsonc
// request — plain text, max 1200 chars
{ "text": "4 days in the Bahamas, swim with stingrays, I'm flexible, 2 bedroom place" }

// response
{
  "data": { "destination": "Nassau, Bahamas", "nights": 4,
            "planningStyle": "flexible", "bedrooms": 2, "vibes": ["adventurous"] },
  "missing": ["startDate", "endDate", "numAdults", "email"],
  "interpretation": "4 nights in the Bahamas, flexible, 2 bedrooms.",
  "unmapped": []
}
```

**Text in, never audio.** The web sends text from the Web Speech API; a native
client sends text from its own recognizer. That is what lets both share this
endpoint unchanged.

The parser will **not invent** a destination, date, group size or email — it
omits the field and lists it in `missing`. Show a confirmation screen and ask
for the gaps; do not auto-generate from an unconfirmed parse.

Model output is filtered against allowlists server-side, so `data` only ever
contains values the app recognizes.

### `POST /api/v1/suggest`

Destination-aware option suggestions for the wizard. Cached in Redis for 7 days.

```jsonc
{ "destination": "Outer Banks, NC", "numKids": 2 }
→ { "tripTypes": [...], "vibes": [...], "cuisines": [...], "amenities": [...] }
```

---

## Errors

Non-2xx responses carry `{ "error": string }`, sometimes with extra context
(e.g. `missing` on a 400 from `POST /api/v1/trips`). `IrieApiError` from the
typed client exposes `.status` and `.body`.

| Status | Meaning |
| --- | --- |
| `400` | Bad or incomplete input |
| `402` | Payment not confirmed |
| `404` | Trip not found, or no file for it |
| `422` | Trip has no schedulable dates (calendar only) |
| `500` | Generation or upstream failure |

---

## Legacy endpoints

Still live so nothing deployed breaks. They share the same handlers as their v1
equivalents — prefer v1 in new clients.

| Legacy | v1 |
| --- | --- |
| `POST /api/stripe/checkout` | `POST /api/v1/trips` |
| `GET /api/trip?slug=` | `GET /api/v1/trips/{slug}` |
| `POST /api/generate` | `POST /api/v1/trips/{slug}/generate` |
| `POST /api/suggest` | `POST /api/v1/suggest` |

---

## Building the mobile client

`src/core/` is deliberately free of web dependencies — no `next/*`, no DOM, no
React. Copy or symlink the whole directory into the Expo app and you get:

| Module | What it gives you |
| --- | --- |
| `api-client.ts` | Every endpoint above, typed |
| `types.ts` | `WizardData`, `GeneratedTrip`, `NormalizedTrip`, … |
| `normalize.ts` | Legacy→current trip shape, so old trips render |
| `calendar.ts` | `buildTripEvents()` → feed straight to `expo-calendar` |
| `partners.ts` | Lodging deep links (open with `Linking.openURL`) |
| `ingredients.ts` | Grocery deduplication |
| `wizard-machine.ts` | Required fields, defaults, night maths |
| `referral.ts` | Referral code validation |
| `intent.ts` | Voice/NL intake types |

Design tokens live in `src/theme/tokens.ts` as plain objects — import
`lightTheme` / `darkTheme` directly and read values off them, since React Native
has no CSS cascade. The web's CSS custom properties are generated from that same
file (`npm run tokens`), so the two cannot drift.

The pieces that stay web-only and need a native equivalent:

| Web | Native |
| --- | --- |
| `useSpeechInput` (Web Speech API) | `@react-native-voice/voice` behind the same `SpeechRecognizer` interface |
| `localStorage` (wizard draft, packing state) | `AsyncStorage` |
| `.ics` download | `expo-calendar` + `buildTripEvents()` |
| Stripe Checkout redirect | `Linking.openURL` or an in-app browser |
| Google Places JS SDK | Places REST API |
