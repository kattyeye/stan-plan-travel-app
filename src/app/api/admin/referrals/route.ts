import { NextResponse } from "next/server";
import { listAllTrips } from "@/lib/db";

export interface ReferralSummary {
  code: string;
  total: number;
  /** Trips that reached a paid state — what a creator actually gets paid for. */
  converted: number;
  lastSeen: string;
  destinations: string[];
}

const PAID_STATUSES = new Set(["paid", "generating", "ready"]);

/**
 * GET /api/admin/referrals
 *
 * Creator attribution rolled up per referral code, so payouts can be cut
 * without exporting the whole trip list.
 */
export async function GET() {
  try {
    const trips = await listAllTrips();
    const byCode = new Map<string, ReferralSummary>();

    for (const trip of trips) {
      if (!trip.referralCode) continue;
      const entry = byCode.get(trip.referralCode) ?? {
        code: trip.referralCode,
        total: 0,
        converted: 0,
        lastSeen: trip.createdAt,
        destinations: [],
      };

      entry.total += 1;
      if (PAID_STATUSES.has(trip.status)) entry.converted += 1;
      if (trip.createdAt > entry.lastSeen) entry.lastSeen = trip.createdAt;

      const destination = trip.wizardData?.destination;
      if (destination && !entry.destinations.includes(destination) && entry.destinations.length < 5) {
        entry.destinations.push(destination);
      }
      byCode.set(trip.referralCode, entry);
    }

    const referrals = [...byCode.values()].sort((a, b) => b.converted - a.converted || b.total - a.total);
    const unattributed = trips.filter((t) => !t.referralCode).length;

    return NextResponse.json({ referrals, unattributed, totalTrips: trips.length });
  } catch (error) {
    console.error("Admin referrals error:", error);
    return NextResponse.json({ error: "Failed to load referrals" }, { status: 500 });
  }
}
