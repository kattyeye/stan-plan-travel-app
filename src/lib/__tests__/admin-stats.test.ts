import { describe, expect, it } from "vitest";
import type { TripRecord } from "@/types/trip";
import { computeStats, setupChecklist } from "../admin-stats";
import { isSessionSettled, paymentFromSession } from "../stripe";
import { wizard } from "./fixtures";

const NOW = new Date("2030-06-20T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const trip = (over: Partial<TripRecord>): TripRecord => ({
  id: 1,
  slug: `s${Math.random().toString(36).slice(2, 10)}`,
  email: "a@x.com",
  tripNickname: "T",
  status: "ready",
  wizardData: wizard(),
  createdAt: hoursAgo(2),
  updatedAt: hoursAgo(1),
  ...over,
});

describe("computeStats", () => {
  const trips: TripRecord[] = [
    trip({ billing: "stripe", payment: { amountCents: 1900, discountCents: 0, currency: "usd", at: hoursAgo(2) }, progress: { stage: "done", message: "", percent: 100, startedAt: hoursAgo(2), updatedAt: new Date(Date.parse(hoursAgo(2)) + 6 * 60_000).toISOString() } }),
    trip({ billing: "stripe", email: "a+2@x.com" }), // paid, no payment record → estimated at list price
    trip({ billing: "stripe", status: "pending", createdAt: hoursAgo(3) }), // abandoned checkout
    trip({ billing: "free", status: "error", errorMessage: "Boom", email: "b@x.com" }),
    trip({ billing: "comp", status: "generating", updatedAt: hoursAgo(1), email: "beta@x.com" }), // stuck > 20 min
    trip({ billing: "free", createdAt: hoursAgo(24 * 40), email: "old@x.com" }), // outside 30 days
    trip({ billing: "free", edits: { version: 2, mealSwaps: {}, hidden: [], done: [], log: [], updatedAt: hoursAgo(1), reports: [{ at: hoursAgo(1), reason: "closed", venueName: "Owens'" }] } }),
  ];
  const s = computeStats(trips, { now: NOW, priceCents: 1900 });

  it("counts plans by how they were paid for, and revenue from Stripe's numbers", () => {
    expect(s.billing30).toEqual({ stripe: 2, free: 2, comp: 1, partner: 0 });
    expect(s.revenue30Cents).toBe(3800);
    expect(s.revenueEstimated).toBe(true);
    expect(s.last30).toBe(6);
    expect(s.status).toEqual({ ready: 4, building: 1, pending: 1, error: 1 });
  });

  it("measures reliability and build time", () => {
    expect(s.successRate7).toBeCloseTo(3 / 4); // 3 ready, 1 failed (the old trip is outside 7 days)
    expect(s.medianBuildMinutes).toBeCloseTo(6);
  });

  it("merges inbox aliases into one traveller", () => {
    const a = s.users.find((u) => u.email.startsWith("a"))!;
    expect(a.trips).toBe(4);
    expect(a.paid).toBe(2);
  });

  it("lists what needs attention, most urgent first", () => {
    expect(s.attention.map((x) => x.kind)).toEqual(["stuck", "error", "report", "abandoned"]);
    expect(s.reports).toBe(1);
    expect(s.tripsWithGroupEdits).toBe(1);
  });

  it("buckets trips by day for the chart", () => {
    expect(s.daily).toHaveLength(14);
    // The unpaid checkout isn't a started plan.
    expect(s.daily[13]).toMatchObject({ date: "2030-06-20", total: 5, stripe: 2, free: 2, comp: 1 });
  });
});

describe("setupChecklist", () => {
  it("reports what's configured without exposing values", () => {
    const c = setupChecklist({ STRIPE_SECRET_KEY: "sk_live_abc", EMAIL_FROM: "Irie <trips@yourdomain.com>", RESEND_API_KEY: "re_x" } as unknown as NodeJS.ProcessEnv);
    expect(c.live).toBe(true);
    expect(c.items.find((i) => i.label.startsWith("Email"))!.ok).toBe(false);
    expect(JSON.stringify(c)).not.toContain("sk_live_abc");
    expect(c.blocking).toBeGreaterThan(0);
  });
});

describe("Stripe helpers", () => {
  it("treat 100%-off promo checkouts as settled and record the discount", () => {
    expect(isSessionSettled({ payment_status: "paid" })).toBe(true);
    expect(isSessionSettled({ payment_status: "no_payment_required" })).toBe(true);
    expect(isSessionSettled({ payment_status: "unpaid" })).toBe(false);
    expect(paymentFromSession({ amount_total: 0, currency: "usd", total_details: { amount_discount: 1900, amount_shipping: 0, amount_tax: 0 } })).toMatchObject({ amountCents: 0, discountCents: 1900, currency: "usd" });
  });
});
