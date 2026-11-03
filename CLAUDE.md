# Irie — Project Context for Claude Code

Read this file at the start of every session. It describes the system as it actually is.

---

## What Is This

Irie is a travel-planning SaaS. A guest fills out a short wizard about their trip, pays via Stripe, and gets a personalised plan: day-by-day itinerary, meal plan with recipes, grocery list, restaurant guide, activities, and packing list.

Each trip gets:
1. A live page at `/trip/[slug]` to share with the travel group (no login; unguessable slug)
2. A self-contained offline `.html` download (`/api/trip/[slug]/download`)

**Product promise: nothing in a plan is made up.** Every venue comes from live web research, is checked against Google Places, and meals are scheduled around real opening hours. Code — not the model — does dates, arithmetic, reference checks, and dietary checks. If you change generation, keep that promise.

The key differentiator is the **planning style axis**: `structured` (exact times, one assigned place per meal), `balanced` (time-of-day buckets, one alternative), `flexible` (moods, 2–3 options per meal).

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (styling is mostly inline styles + CSS tokens)
- **AI:** Anthropic Claude API, `@anthropic-ai/sdk` 1.x (API version 2026-10-21). Default model `claude-opus-5-5`; wizard suggestions use `claude-haiku-5-5`. Override with env vars (below).
- **Storage:** Upstash Redis via `src/lib/kv.ts` (in-memory fallback for local dev). All persistence goes through `src/lib/db.ts` — swap the backend there if moving to Postgres/MySQL.
- **Verification:** Google Places API (New) Text Search (`src/lib/places.ts`)
- **Payments:** Stripe Checkout + webhook
- **Email:** Resend (optional)
- **Validation:** zod (input validation + model output contracts)
- **Tests:** vitest (`npm test`)
- **Hosting:** Vercel (auto-deploys on push to main). **The project is on the Hobby plan: 300s max function duration, and Hobby's terms don't allow commercial use — move to Pro before charging customers.**

### Environment variables

See `.env.example` for the full list with notes. Required: `ANTHROPIC_API_KEY`, `PLAN_UPSTASH_KV_REST_API_URL`, `PLAN_UPSTASH_KV_REST_API_TOKEN`, `NEXT_PUBLIC_APP_URL`, `ADMIN_TOKEN`. Strongly recommended: `GOOGLE_MAPS_API_KEY` (server key, Places API (New)), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.

**Pricing:** each email's first plan is free (`src/lib/billing.ts`: one per normalised email, `IRIE_FREE_PER_IP_PER_DAY`, and a site-wide `IRIE_FREE_DAILY_CAP`); later plans go through Stripe. Without `STRIPE_SECRET_KEY`, only free plans are possible. Without `GOOGLE_MAPS_API_KEY`, venues are only "web-sourced", not "verified".

---

## Generation pipeline (`src/lib/pipeline/`)

```
wizard → POST /api/stripe/checkout (validates; first plan free → "paid" immediately; else trip "pending") → Stripe
Stripe webhook (or the success page's resume call, which verifies the session) → status "paid"
      ↓
runPipeline(slug) — each stage holds a per-trip lock and checkpoints its output
  1. research  claude + web_search_20260209 + strict submit_research tool
               → Google Places verification (closed places dropped, hours attached)
               (packing list generated in parallel)
  2. plan      structured output; may only reference researched venue ids
               → normalizePlan: dates/weekdays from code, closed-day swaps,
                 broken refs fixed, one LLM repair if days are missing
  3. recipes   structured output in parallel batches → rescaled to group size in code,
               dietary/allergy check, one rewrite for allergy conflicts
  4. finalize  assembleTrip: grocery math, quality report → status "ready" → email + partner webhook
```

- Stages run in separate function invocations on Vercel (`/api/internal/pipeline` hand-off), each well under the 300s cap. Locally everything runs inline.
- The waiting page (`/trip/[slug]/generating`) polls `/api/trip?slug=` and calls `/api/trip/[slug]/resume` every 30s; resume restarts a stalled stage from its checkpoint and never starts an unpaid trip.
- `normalize.ts` is pure and unit-tested. Put new correctness rules there, with tests.
- Prompts live in `src/lib/pipeline/prompts.ts`; model I/O schemas in `schemas.ts`. Guest-typed text is wrapped in `<guest_notes>` and treated as data.
- Every generated trip carries `quality` (venue verification counts + issues). Admins see it at `/admin/trips`; travellers see a summary.

### Claude API usage (`src/lib/claude.ts`)

- Always stream (`client.beta.messages.stream(...).finalMessage()`).
- Structured outputs via `output_config.format` with `toStrictJsonSchema(zodSchema)`; responses are re-validated with zod.
- Web search can't be combined with structured outputs (citations), so research hands results back through a `strict: true` tool with `tool_choice: auto` (forced tool choice is a 400 on Opus 5.5).
- Never edit earlier turns or the tools list inside a research loop — only append (thinking blocks are bound to the prefix). `pause_turn` is handled by re-sending the assistant turn.
- Thinking is always on for Opus 5.5; control depth with `output_config.effort`. Don't send `temperature`/`top_p`/`top_k` (400 on API version 2026-10-21).
- Server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) is on for non-Haiku models.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                         landing page
│   ├── wizard/page.tsx                  wizard (supports ?draft= and ?destination=&checkin=… prefill)
│   ├── trip/[slug]/page.tsx             trip view (redirects to /generating until ready)
│   ├── trip/[slug]/generating/page.tsx  live progress, resume, retry
│   ├── preview/[city]/page.tsx          sample plans behind a paywall gate
│   ├── admin/trips/page.tsx             admin console (ADMIN_TOKEN)
│   └── api/
│       ├── stripe/checkout, stripe/webhook
│       ├── trip (status) · trip/[slug]/resume · trip/[slug]/download
│       ├── internal/pipeline            stage hand-off (internal secret)
│       ├── suggest                      wizard chip suggestions (Haiku, cached, rate-limited)
│       ├── drafts/[id]                  partner prefill drafts
│       ├── admin/trips[/slug[/regenerate]] · admin/partners
│       ├── v1/client/*                  public API for mobile apps & extensions — docs/CLIENT_API.md
│       └── v1/trips[/id] · v1/openapi.json   partner API — see docs/PARTNER_API.md
├── components/
│   ├── ui/          Tailwind UI kit — DO NOT modify
│   ├── wizard/      WizardShell, WizardProgress, steps/*, ui/* (wizard primitives)
│   └── trip/        TripHeader, TripActions, TripTabs, ItinerarySection, MealRow, MealPlanSection,
│                    RecipeCard, GrocerySection, RestaurantSection, TipsSection, PackingSection,
│                    VerifiedBadge, PaywallGate
├── hooks/useStoredChecklist.ts          localStorage-backed checkboxes (grocery, packing)
├── lib/
│   ├── claude.ts        model config, structured + web-search helpers
│   ├── pipeline/        index (orchestrator), prompts, schemas, normalize, dietary, days
│   ├── places.ts        Google Places verification + opening-hours math
│   ├── db.ts / kv.ts    storage, locks, checkpoints
│   ├── validation.ts    zod input validation (wizard + partner)
│   ├── security.ts      admin/internal auth, rate limiting, origins
│   ├── stripe.ts · notify.ts · export-html.ts · utils.ts (quantities, grocery aggregation)
│   ├── trips/           startTrip (pricing + validation) and resumeTrip — shared by web + client API
│   ├── options.ts       every wizard option list (web wizard and /api/v1/client/config)
│   ├── suggest.ts · geocode.ts   destination suggestions and autocomplete
│   ├── api/client.ts    client-API response envelope + CORS
│   ├── partners/        API keys + signed webhooks, listing adapters (Airbnb/VRBO), drafts
│   └── __tests__/       vitest suites
├── styles/print.css
└── types/trip.ts        ALL shared types
src/sdk/irie-client.ts       typed client for apps/extensions (wraps /api/v1/client)
scripts/mock-anthropic.mjs   local mock of the Messages API for credit-free development
docs/PARTNER_API.md          partner integration guide
```

---

## Design System

- Warm, organic, earthy — feels like a trusted friend planned your trip. No generic SaaS look.
- **Fonts:** DM Serif Display (`var(--font-display)`) for headings; Inter (`var(--font-sans)`) for UI.
- **All colors come from CSS custom properties in `src/app/globals.css`**, with light and `.dark` values. Use semantic tokens:
  - Backgrounds: `--color-bg`, `--color-bg-card`, `--color-bg-input`, `--color-bg-selected`
  - Text: `--color-text`, `--color-text-muted`, `--color-text-faint`, `--color-text-inverse`, `--color-heading`
  - Brand: `--color-brand`, `--color-brand-hover`, `--color-brand-light`, `--color-brand-disabled`, `--color-accent`
  - Borders: `--color-border`, `--color-border-focus`
  - Status: `--color-success-*`, `--color-warning-*`, `--color-error-*` (`-text`, `-bg`, `-border`)
  - Header: `--color-header-bg`, `--color-header-text`, `--color-header-muted`
  - Shape: `--radius-card`, `--radius-input`, `--radius-chip`, `--shadow-card`, `--shadow-float`
  - Raw palettes (`--color-tea-green-*`, `--color-light-bronze-*`, …) exist but prefer semantic tokens.
- Tokens work in inline styles (`style={{ color: "var(--color-text)" }}`) and CSS, not in Tailwind utility classes.
- The navbar is sticky at 60px; other sticky bars use `top: 60`.
- Mobile first: check 390px width, 44px touch targets, no horizontal scroll.

---

## Key Rules

1. **Never hardcode colors** — use the tokens above. (The offline HTML export defines its own tokens because it must be self-contained.)
2. **Never modify `src/components/ui/`** (Tailwind UI kit).
3. **Add `"use client"`** to components using state, effects, or event handlers.
4. **`recipes[]` is the source of truth** — itinerary and grocery reference by `recipeId`; restaurants are referenced by `restaurantId`. Never duplicate.
5. **Never trust model output for facts code can compute**: dates, weekdays, quantities, servings, ids, opening hours. Validate with zod and normalize in `normalize.ts`.
6. **Website and client API share one implementation** (`lib/trips`, `lib/options`, `lib/suggest`, `lib/geocode`) — never fork logic into a route.
7. **Never start generation for an unpaid trip** and never accept wizard data from the client at generation time — the pipeline reads the stored trip.
8. **The planning style must change the output everywhere** — itinerary phrasing, meal options, UI badges.
9. Run `npm run typecheck`, `npm test` and `npm run build` before pushing.
10. **Commit messages:** `feat:`, `fix:`, `style:`, `deps:`, `refactor:`, `test:`, `docs:` prefixes.

---

## Local development

```bash
npm install
npm run dev:mock    # terminal 1: mock Claude API on :4010 (no credits used)
ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=mock ADMIN_TOKEN=dev npm run dev
```

Without Redis env vars the app uses an in-memory store (dev only). The mock returns fictional places — use a real key to judge plan quality.

---

## Common Issues

- **Trip stuck on the waiting page:** check `/admin/trips` → Details for the pipeline's last error. The page's resume call restarts stalled stages automatically; "Regenerate" starts fresh.
- **"Admin is disabled":** set `ADMIN_TOKEN`.
- **No "Verified" badges:** `GOOGLE_MAPS_API_KEY` missing, or Places API (New) not enabled for that key.
- **Function timeouts:** each stage must stay under the plan's limit (Hobby 300s). Lower `IRIE_MAX_SEARCHES` or effort if research runs long.
- **White screen on a client page:** missing `"use client"` or a browser API used during SSR.

---

*Last updated: November 2026 — grounded generation pipeline, partner API, security hardening.*
