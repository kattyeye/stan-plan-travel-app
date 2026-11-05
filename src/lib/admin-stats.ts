import type { TripRecord } from "@/types/trip";
import { normalizeEmail } from "./billing";

/**
 * Numbers for the admin dashboard, computed in code from trip records (pure,
 * tested). Revenue uses what Stripe reported when it's recorded on the trip,
 * else the list price — flagged as estimated.
 */

export type BillingKind = "stripe" | "free" | "comp" | "partner";

export interface DayCount {
  date: string;
  total: number;
  stripe: number;
  free: number;
  comp: number;
  partner: number;
}

export interface UserRow {
  email: string;
  trips: number;
  paid: number;
  comp: number;
  lastAt: string;
}

export interface AttentionItem {
  slug: string;
  kind: "error" | "stuck" | "report" | "abandoned";
  message: string;
  at: string;
  email: string;
  destination: string;
}

export interface DashboardStats {
  sampleSize: number;
  today: number;
  last7: number;
  last30: number;
  status: { ready: number; building: number; pending: number; error: number };
  billing30: Record<BillingKind, number>;
  revenue30Cents: number;
  revenueEstimated: boolean;
  discounts30Cents: number;
  successRate7: number | null;
  medianBuildMinutes: number | null;
  verifiedShare: number | null;
  reports: number;
  tripsWithGroupEdits: number;
  daily: DayCount[];
  topDestinations: { destination: string; count: number }[];
  users: UserRow[];
  attention: AttentionItem[];
}

const DAY_MS = 86_400_000;
const STUCK_MS = 20 * 60_000;
const ABANDONED_MS = 60 * 60_000;

const billingOf = (t: TripRecord): BillingKind | null => {
  if (t.billing === "comp") return "comp";
  if (t.billing === "partner" || t.partner) return "partner";
  if (t.billing === "free") return "free";
  if (t.billing === "stripe") return t.status === "pending" ? null : "stripe";
  return null;
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function computeStats(trips: TripRecord[], opts: { now: Date; priceCents: number; days?: number }): DashboardStats {
  const now = opts.now.getTime();
  const created = (t: TripRecord) => Date.parse(t.createdAt) || t.id;
  const within = (t: TripRecord, days: number) => now - created(t) < days * DAY_MS;
  const todayKey = opts.now.toISOString().slice(0, 10);

  const status = { ready: 0, building: 0, pending: 0, error: 0 };
  const billing30: Record<BillingKind, number> = { stripe: 0, free: 0, comp: 0, partner: 0 };
  let revenue = 0;
  let discounts = 0;
  let estimated = false;
  let reports = 0;
  let edited = 0;
  let verified = 0;
  let venues = 0;
  const buildMinutes: number[] = [];
  const destinations = new Map<string, number>();
  const users = new Map<string, UserRow>();
  const attention: AttentionItem[] = [];

  const days = opts.days ?? 14;
  const daily: DayCount[] = Array.from({ length: days }, (_, i) => ({
    date: new Date(now - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10),
    total: 0, stripe: 0, free: 0, comp: 0, partner: 0,
  }));
  const dayIndex = new Map(daily.map((d, i) => [d.date, i]));

  for (const t of trips) {
    const kind = billingOf(t);
    const at = new Date(created(t)).toISOString();
    const base = { slug: t.slug, email: t.email, destination: t.wizardData?.destination ?? "" };

    if (t.status === "ready") status.ready++;
    else if (t.status === "paid" || t.status === "generating") status.building++;
    else if (t.status === "pending") status.pending++;
    else if (t.status === "error") status.error++;

    const di = dayIndex.get(at.slice(0, 10));
    if (di !== undefined && kind) {
      daily[di].total++;
      daily[di][kind]++;
    }

    if (within(t, 30)) {
      if (kind) billing30[kind]++;
      if (kind === "stripe") {
        if (t.payment) {
          revenue += t.payment.amountCents;
          discounts += t.payment.discountCents;
        } else {
          revenue += opts.priceCents;
          estimated = true;
        }
      }
      if (t.wizardData?.destination) destinations.set(t.wizardData.destination, (destinations.get(t.wizardData.destination) ?? 0) + 1);
      const q = t.generatedData?.quality;
      if (t.status === "ready" && q) {
        verified += q.venues.verified;
        venues += q.venues.total;
      }
    }

    if (t.status === "ready" && t.progress?.startedAt && t.progress.updatedAt) {
      const mins = (Date.parse(t.progress.updatedAt) - Date.parse(t.progress.startedAt)) / 60_000;
      if (mins > 0 && mins < 180) buildMinutes.push(mins);
    }

    if (t.email) {
      const key = normalizeEmail(t.email);
      const row = users.get(key) ?? { email: t.email, trips: 0, paid: 0, comp: 0, lastAt: at };
      row.trips++;
      if (kind === "stripe") row.paid++;
      if (kind === "comp") row.comp++;
      if (at > row.lastAt) row.lastAt = at;
      users.set(key, row);
    }

    const r = t.edits?.reports ?? [];
    reports += r.length;
    if ((t.edits?.version ?? 0) > 0) edited++;
    for (const rep of r.slice(0, 3)) {
      attention.push({ ...base, kind: "report", at: rep.at, message: `Traveller report: ${rep.reason.replace("_", " ")}${rep.venueName ? ` — ${rep.venueName}` : ""}${rep.note ? ` (“${rep.note}”)` : ""}` });
    }
    if (t.status === "error" && within(t, 14)) attention.push({ ...base, kind: "error", at: t.updatedAt, message: t.errorMessage ?? "Generation failed" });
    if ((t.status === "paid" || t.status === "generating") && now - Date.parse(t.progress?.updatedAt ?? t.updatedAt) > STUCK_MS) {
      attention.push({ ...base, kind: "stuck", at: t.updatedAt, message: `Stuck at “${t.progress?.message ?? t.status}”` });
    }
    if (t.status === "pending" && t.billing === "stripe" && now - created(t) > ABANDONED_MS && within(t, 7)) {
      attention.push({ ...base, kind: "abandoned", at, message: "Checkout started but not paid" });
    }
  }

  const recent7 = trips.filter((t) => within(t, 7));
  const finished7 = recent7.filter((t) => t.status === "ready" || t.status === "error");
  const order: Record<AttentionItem["kind"], number> = { stuck: 0, error: 1, report: 2, abandoned: 3 };

  return {
    sampleSize: trips.length,
    today: trips.filter((t) => new Date(created(t)).toISOString().slice(0, 10) === todayKey).length,
    last7: recent7.length,
    last30: trips.filter((t) => within(t, 30)).length,
    status,
    billing30,
    revenue30Cents: revenue,
    revenueEstimated: estimated,
    discounts30Cents: discounts,
    successRate7: finished7.length ? finished7.filter((t) => t.status === "ready").length / finished7.length : null,
    medianBuildMinutes: median(buildMinutes),
    verifiedShare: venues ? verified / venues : null,
    reports,
    tripsWithGroupEdits: edited,
    daily,
    topDestinations: [...destinations.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([destination, count]) => ({ destination, count })),
    users: [...users.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt)).slice(0, 25),
    attention: attention.sort((a, b) => order[a.kind] - order[b.kind] || b.at.localeCompare(a.at)).slice(0, 15),
  };
}

/** Which integrations are configured — names only, never values. */
export function setupChecklist(env: NodeJS.ProcessEnv = process.env) {
  const stripeKey = env.STRIPE_SECRET_KEY ?? "";
  const from = env.EMAIL_FROM ?? "";
  const redis = !!((env.PLAN_UPSTASH_KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) && (env.PLAN_UPSTASH_KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN));
  type Item = { label: string; ok: boolean; required: boolean; detail: string };
  const items: Item[] = [
    { label: "Payments (Stripe key)", ok: !!stripeKey, required: true, detail: stripeKey.startsWith("sk_live_") ? "Live mode — real charges" : stripeKey ? "Test mode — no real charges yet" : "Set STRIPE_SECRET_KEY" },
    { label: "Payment confirmations (webhook)", ok: !!env.STRIPE_WEBHOOK_SECRET, required: true, detail: env.STRIPE_WEBHOOK_SECRET ? "Set" : "Add the /api/stripe/webhook endpoint in Stripe and set STRIPE_WEBHOOK_SECRET" },
    { label: "Email (sign-in links, plan ready)", ok: !!env.RESEND_API_KEY && !!from && !from.includes("yourdomain"), required: true, detail: env.RESEND_API_KEY ? (from && !from.includes("yourdomain") ? `Sending as ${from}` : "Set EMAIL_FROM to an address on your verified domain") : "Set RESEND_API_KEY and verify your domain in Resend" },
    { label: "Admins", ok: !!env.ADMIN_EMAILS, required: true, detail: env.ADMIN_EMAILS ? `${env.ADMIN_EMAILS.split(",").filter(Boolean).length} admin email(s)` : "Set ADMIN_EMAILS" },
    { label: "Session secret", ok: !!env.AUTH_SECRET, required: false, detail: env.AUTH_SECRET ? "Set" : "Using a derived secret — set AUTH_SECRET so rotating other keys doesn't sign everyone out" },
    { label: "Public URL", ok: !!env.NEXT_PUBLIC_APP_URL, required: true, detail: env.NEXT_PUBLIC_APP_URL ?? "Set NEXT_PUBLIC_APP_URL (links in emails)" },
    { label: "Database (Redis)", ok: redis, required: true, detail: redis ? "Upstash connected" : "Not configured — data won't persist" },
    { label: "Place verification (Google Places)", ok: !!env.GOOGLE_MAPS_API_KEY, required: false, detail: env.GOOGLE_MAPS_API_KEY ? "Set" : "Without it, places are web-sourced, not verified" },
    { label: "Day maps (Maps Embed key)", ok: !!env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, required: false, detail: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Set — restrict it to your domain" : "Days show an Open-in-Google-Maps link instead" },
    { label: "Sales tax (Stripe Tax)", ok: env.STRIPE_AUTOMATIC_TAX === "true", required: false, detail: env.STRIPE_AUTOMATIC_TAX === "true" ? "On" : "Off — turn on once Stripe Tax is set up" },
  ];
  return { items, live: stripeKey.startsWith("sk_live_"), blocking: items.filter((i) => i.required && !i.ok).length };
}
