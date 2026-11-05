# Going live: real customers, real payments

Everything below is configuration — the code for payments, sign-in, beta testers and the admin dashboard is already in the app. After changing environment variables in Vercel, **redeploy** (Vercel → Deployments → ⋯ → Redeploy) so they take effect.

The admin dashboard at **/admin** shows a live checklist of which of these are done.

## 0. Vercel Pro

The Hobby plan's terms don't allow commercial use. Upgrade the project's team to **Pro** before charging anyone (Vercel → Settings → Billing).

## 1. Stripe (payments)

Irie charges once per trip plan (first plan per email free). Price: `TRIP_PRICE_CENTS` (default `1900` = $19).

1. Create an account at stripe.com. You can do everything below in **test mode** first; to take real money, complete **Activate payments** (business details, bank account for payouts).
2. **API key:** Developers → API keys → copy the **Secret key** → Vercel env `STRIPE_SECRET_KEY` (`sk_test_…` while testing, `sk_live_…` for real).
3. **Webhook:** Developers → Webhooks → Add endpoint
   - URL: `https://irietravel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   - Copy the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`
   - Test and live mode have **separate** keys and webhooks — set both up when you switch.
4. **Receipts:** Settings → Customer emails → turn on *Successful payments* (Irie also asks Stripe to email a receipt for every live payment).
5. **Promo codes** (free or discounted plans for anyone you give a code to): Product catalog → Coupons → New (e.g. 100% off, *Once*) → **Create promotion code** (e.g. `IRIEBETA`, with a redemption limit and expiry). Checkout shows an *Add promotion code* field; 100%-off orders go straight through.
6. **Sales tax (optional):** set up Stripe Tax (origin address, registrations), then set `STRIPE_AUTOMATIC_TAX=true`. Leave it unset until then — Checkout errors if tax is on but not configured.
7. **Test it:** with test keys, use an email that already used its free plan, pay with card `4242 4242 4242 4242` (any future date, any CVC), and check the trip starts building and shows in /admin revenue.

**Stripe will also ask for** a refund/cancellation policy, terms, privacy policy and contact details on your site. Add those pages before activating.

## 2. Email (Resend) — needed for sign-in

1. resend.com → Domains → add `irietravel.app` → add the DNS records it shows (Vercel → Domains → irietravel.app → DNS Records) → Verify.
2. API Keys → create one → `RESEND_API_KEY`.
3. `EMAIL_FROM="Irie <trips@irietravel.app>"` (any address on the verified domain).

Without Resend, production sign-in is switched off (the login page says so) and "your plan is ready" emails aren't sent.

## 3. Sign-in and admin

- `ADMIN_EMAILS` — your email(s), comma-separated. Sign in at `/login` with one of them, then open `/admin`.
- `AUTH_SECRET` — run `openssl rand -hex 32` and paste the result. (If unset, a secret is derived from other keys; setting it means rotating those keys won't sign everyone out.)
- `ADMIN_TOKEN` — optional now; only for scripts calling `/api/admin/*`.
- `NEXT_PUBLIC_APP_URL=https://irietravel.app` — used in emailed links.

Travellers sign in with a one-tap email link (no passwords) and see every plan made with their email at **/account** ("My trips").

## 4. Beta testers ("evergreen" users)

In **/admin → Beta testers**, add an email. That person's plans are free, skip the free-plan limits and never touch Stripe, until you remove them (safety cap `IRIE_BETA_DAILY_LIMIT`, default 10 a day each). Their trips count as **beta** in the dashboard, not revenue. For one-off freebies, use a Stripe promotion code instead (above).

## 5. Google keys

- `GOOGLE_MAPS_API_KEY` — server key with **Places API (New)**: verified places and real opening hours.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — a separate browser key with only **Maps Embed API**, restricted to websites `https://irietravel.app/*`, `https://www.irietravel.app/*`, `https://stan-plan-travel-app.vercel.app/*`.

## 6. Spend guards

Each plan costs real Claude and Google API money. Set a monthly spend limit in the Anthropic console, and tune `IRIE_FREE_DAILY_CAP` (site-wide free plans per day) and `IRIE_FREE_PER_IP_PER_DAY`.

## 7. Smoke test after deploying

1. `/login` with your admin email → the email arrives → you land on My trips.
2. `/admin` → the checklist shows what's left; add yourself or a friend as a beta tester.
3. Plan a trip as the beta tester → it's free, shows **Beta** in My trips and the dashboard.
4. Plan a trip with an email that already used its free plan → Stripe Checkout → pay (test card or a 100% promo code) → it builds → revenue/discount shows in /admin.
5. Open a ready trip on irietravel.app → the day map loads.
