# Irie Client API (v1)

The public API behind the website, packaged for **Irie's own mobile apps and browser extensions**. It runs the same code as the website, so pricing, validation, the free first plan and the generation pipeline behave identically everywhere.

- Base URL: `https://irietravel.app/api/v1/client`
- Spec: `GET /api/v1/openapi.json` (tag `client`)
- Typed TypeScript client: [`src/sdk/irie-client.ts`](../src/sdk/irie-client.ts)

For booking platforms (Airbnb, VRBO, property managers), use the authenticated [Partner API](PARTNER_API.md) instead.

## Security model

- **No API keys.** Anything shipped inside an app or extension can be extracted, so a key would protect nothing. The endpoints are public, like the website's, and protected by validation and per-IP rate limits.
- **The trip id is the access capability.** Same as the website: anyone with the id (or the `/trip/{id}` link) can view that plan. Store ids on the device; don't log them publicly.
- **No cookies or credentials are accepted**, so CORS is open (`Access-Control-Allow-Origin: *`). To restrict it, set `IRIE_CLIENT_ORIGINS` (comma-separated), e.g. `chrome-extension://<your-extension-id>`.
- Send `X-Irie-Client: ios/1.2.0` (or `android/…`, `chrome-ext/…`) so traffic can be told apart later.

## Flow

```
GET  /config                     → render the wizard (option lists, limits, price, free-plan flag)
GET  /places?q=corf              → destination autocomplete (debounce ~250ms)
GET  /suggestions?destination=…  → highlight the options that fit that place (optional)
POST /trips { trip }             → 201 { id, payment, checkoutUrl }
     payment = "free"     → building already; go to the waiting screen
     payment = "checkout" → open checkoutUrl in an in-app browser (SFSafariViewController /
                            Chrome Custom Tab / new tab); the build starts when Stripe confirms
GET  /trips/{id}?plan=false      → poll every ~4s: status + progress { stage, percent, message }
POST /trips/{id}/resume          → every ~30s while waiting (restarts stalled work; safe to repeat)
GET  /trips/{id}                 → when status is "ready", `plan` holds the full GeneratedTrip
GET  /trips/{id}/download        → offline HTML copy (save for airplane mode)
```

With the SDK:

```ts
import { IrieClient, IrieApiError } from "./irie-client";

const irie = new IrieClient({ baseUrl: "https://irietravel.app", clientName: "ios/1.0.0" });

try {
  const created = await irie.createTrip({
    destination: "Corfu, Greece",
    startDate: "2027-06-10",
    endDate: "2027-06-15",
    email: "me@example.com",
    numAdults: 2,
    numKids: 2,
    kidAges: [6, 9],
    dietaryRestrictions: ["Vegan"],
  });
  if (created.payment === "checkout") await openInAppBrowser(created.checkoutUrl!);
  const plan = await irie.waitForTrip(created.id, { onProgress: (t) => setProgress(t.progress) });
  render(plan);
} catch (e) {
  if (e instanceof IrieApiError && e.type === "invalid_request") showFieldErrors(e.fields);
  else if (e instanceof IrieApiError && e.type === "payment_required") showPaywall(e.reason);
  else throw e;
}
```

## Trip input

Only `destination`, `startDate`, `endDate` (YYYY-MM-DD) and `email` are required. Everything else has a default and should come from `/config` option values: `tripType`, `numAdults`, `numKids`, `kidAges`, `planningStyle`, `budget`, `vibes`, `travelMethod`, `cookInRatio`, `dietaryRestrictions`, `cuisinePreferences`, `propertyDescription`, `propertyAmenities`, `sections`. Trips can be up to `limits.maxNights` nights and must start today or later.

## Errors

```json
{ "error": { "type": "invalid_request", "message": "endDate: Trips can be up to 21 nights", "fields": { "endDate": "Trips can be up to 21 nights" } } }
```

| type | HTTP | What to do |
|---|---|---|
| `invalid_request` | 400 | Show `fields` next to the inputs |
| `not_found` | 404 | Unknown id (or not ready, for download) |
| `payment_required` | 402 | Free plan used (`reason: "used"`) or today's free cap reached (`daily_cap`, `ip_limit`) while payments aren't enabled |
| `rate_limited` | 429 | Wait `retryAfter` seconds |
| `storage_unavailable` | 503 | Temporary — retry with backoff; the user's answers are safe on the device |
| `server_error` | 500 | Retry later |

## Status values

`pending` (awaiting payment) → `paid` (queued) → `generating` → `ready`, or `error` (call `/resume` with `{ "retry": true }` from a "Try again" button). `progress.stage` is one of `research`, `plan`, `recipes`, `finalize`, `done`.

## Versioning

Responses carry `Irie-Api-Version`. Changes within v1 are additive (new fields, new endpoints); breaking changes get a `/api/v2/client`. Ignore fields you don't recognise.
