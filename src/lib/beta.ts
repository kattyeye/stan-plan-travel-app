import { getKV } from "./kv";
import { normalizeEmail } from "./billing";
import { sha256 } from "./security";

/**
 * Beta testers ("evergreen" users): emails the admin adds from the dashboard.
 * Their plans are free ("comp"), skip the free-plan limits and never touch
 * Stripe — until they're removed. A per-tester daily cap
 * (IRIE_BETA_DAILY_LIMIT, default 10) guards against a runaway script, since
 * every plan costs real API money.
 */

export interface BetaTester {
  email: string;
  note?: string;
  addedAt: string;
  addedBy?: string;
}

const LIST_KEY = "beta:list";
const userKey = (email: string) => `beta:user:${sha256(normalizeEmail(email))}`;
const countKey = (email: string) => `beta:count:${sha256(normalizeEmail(email))}:${new Date().toISOString().slice(0, 10)}`;
const dailyLimit = () => Number(process.env.IRIE_BETA_DAILY_LIMIT ?? 10);

export async function isBetaTester(email: string): Promise<boolean> {
  if (!email) return false;
  return (await getKV().get<BetaTester>(userKey(email))) !== null;
}

export async function listBetaTesters(): Promise<BetaTester[]> {
  return (await getKV().get<BetaTester[]>(LIST_KEY)) ?? [];
}

export async function addBetaTester(email: string, opts: { note?: string; addedBy?: string } = {}): Promise<BetaTester> {
  const kv = getKV();
  const tester: BetaTester = {
    email: email.trim().toLowerCase(),
    note: opts.note?.trim().slice(0, 120) || undefined,
    addedAt: new Date().toISOString(),
    addedBy: opts.addedBy,
  };
  await kv.set(userKey(email), tester);
  const list = (await listBetaTesters()).filter((t) => normalizeEmail(t.email) !== normalizeEmail(email));
  await kv.set(LIST_KEY, [tester, ...list]);
  return tester;
}

export async function removeBetaTester(email: string): Promise<void> {
  const kv = getKV();
  await kv.del(userKey(email));
  await kv.set(LIST_KEY, (await listBetaTesters()).filter((t) => normalizeEmail(t.email) !== normalizeEmail(email)));
}

/** True when this email is a beta tester with plans left today (and counts one). */
export async function claimBetaPlan(email: string): Promise<boolean> {
  if (!(await isBetaTester(email))) return false;
  const kv = getKV();
  const n = await kv.incr(countKey(email));
  if (n === 1) await kv.expire(countKey(email), 2 * 86_400);
  return n <= dailyLimit();
}
