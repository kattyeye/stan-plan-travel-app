/**
 * Creator referral codes.
 *
 * This is the inbound side of monetization and is the mirror image of
 * src/core/partners.ts:
 *
 *   partners.ts  — Irie earns when a customer books lodging through our link.
 *   referral.ts  — a creator earns when their audience buys a $19 plan.
 *
 * A creator shares irie.app/?ref=theirhandle. The code is captured to a cookie,
 * stamped onto the trip record at creation, and mirrored into Stripe metadata
 * so payouts reconcile against real payments rather than abandoned carts.
 *
 * Platform-free — safe to import from React Native.
 */

export const REFERRAL_COOKIE = "irie_ref";
export const REFERRAL_QUERY_PARAM = "ref";
/** Long enough to survive "I'll book this next payday", short enough to be fair. */
export const REFERRAL_TTL_DAYS = 30;

const MAX_LENGTH = 40;

/**
 * Normalize an untrusted referral code, or return null.
 *
 * Codes arrive from a URL anyone can craft and end up in Stripe metadata and
 * admin views, so restrict to a conservative character set rather than
 * trusting the input.
 */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase().slice(0, MAX_LENGTH);
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(code)) return null;
  return code;
}

/** Build a creator's share link. */
export function referralUrl(appUrl: string, code: string, path = "/"): string {
  const normalized = normalizeReferralCode(code);
  const url = new URL(path, appUrl);
  if (normalized) url.searchParams.set(REFERRAL_QUERY_PARAM, normalized);
  return url.toString();
}
