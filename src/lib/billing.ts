import { getKV } from "./kv";
import { sha256 } from "./security";

/**
 * Free-first-plan policy. Every email gets one plan free; after that it's paid
 * through Stripe. Each free plan costs real Claude/API money, so three limits
 * keep it from being farmed:
 *   1. one per email (normalised so "a.b+x@gmail.com" == "ab@gmail.com")
 *   2. IRIE_FREE_PER_IP_PER_DAY free plans per network per day (default 2)
 *   3. IRIE_FREE_DAILY_CAP free plans site-wide per day (default 25) — a hard
 *      ceiling on daily free spend; past it, guests are asked to pay that day.
 * Set IRIE_FREE_FIRST_PLAN=false to turn the free plan off.
 */

const DAY = 60 * 60 * 24;

export function freePlanEnabled(): boolean {
  return process.env.IRIE_FREE_FIRST_PLAN !== "false";
}

const perIpLimit = () => Number(process.env.IRIE_FREE_PER_IP_PER_DAY ?? 2);
const dailyCap = () => Number(process.env.IRIE_FREE_DAILY_CAP ?? 25);

/** Collapses aliases of the same inbox. */
export function normalizeEmail(email: string): string {
  const [rawLocal, rawDomain = ""] = email.trim().toLowerCase().split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  let local = rawLocal.split("+")[0];
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

const today = () => new Date().toISOString().slice(0, 10);
const emailKey = (email: string) => `free:email:${sha256(normalizeEmail(email))}`;
const ipKey = (ip: string) => `free:ip:${sha256(ip)}:${today()}`;
const globalKey = () => `free:global:${today()}`;

export type FreeDecision = { free: true } | { free: false; reason: "disabled" | "used" | "ip_limit" | "daily_cap" | "no_email" };

/**
 * Atomically claims the free plan for this email if every limit allows it.
 * Call only when you're about to create the trip; release with
 * releaseFreePlan() if creating it fails.
 */
export async function claimFreePlan(email: string, ip: string): Promise<FreeDecision> {
  if (!freePlanEnabled()) return { free: false, reason: "disabled" };
  if (!email) return { free: false, reason: "no_email" };
  const kv = getKV();

  if ((await kv.get(emailKey(email))) !== null) return { free: false, reason: "used" };

  const global = await kv.incr(globalKey());
  if (global === 1) await kv.expire(globalKey(), 2 * DAY);
  if (global > dailyCap()) return { free: false, reason: "daily_cap" };

  const perIp = await kv.incr(ipKey(ip));
  if (perIp === 1) await kv.expire(ipKey(ip), 2 * DAY);
  if (perIp > perIpLimit()) return { free: false, reason: "ip_limit" };

  // NX makes the per-email claim race-safe (two tabs submitting at once).
  const claimed = await kv.set(emailKey(email), { at: new Date().toISOString() }, { nx: true });
  return claimed ? { free: true } : { free: false, reason: "used" };
}

export async function releaseFreePlan(email: string): Promise<void> {
  await getKV().del(emailKey(email));
}
