import type { AffiliateConfig } from "@/core/partners";

/**
 * Affiliate ids from the environment.
 *
 * Every field is optional: with none set, partner links still work, they just
 * don't earn. Set BOOKING_AID first — Booking.com's programme is free and open,
 * unlike Expedia's, which needs approval.
 */
export function getAffiliateConfig(): AffiliateConfig {
  return {
    bookingAid: process.env.BOOKING_AID || undefined,
    expediaAffiliateId: process.env.EXPEDIA_AFFILIATE_ID || undefined,
  };
}
