import { createHmac, randomBytes } from "crypto";
import { getKV } from "../kv";
import { bearerToken, sha256 } from "../security";

/**
 * Booking partners (Airbnb, VRBO, property managers…) integrate through
 * /api/v1. Each partner gets an API key (only its hash is stored) and an
 * optional webhook that receives signed `trip.ready` / `trip.failed` events.
 */

export interface Partner {
  id: string;
  name: string;
  /** "partner": the partner pays us; trips start immediately. "guest": guests pay via Stripe checkout. */
  billing: "partner" | "guest";
  webhookUrl?: string;
  webhookSecret?: string;
  active: boolean;
  createdAt: string;
}

const partnerKey = (id: string) => `partner:${id}`;
const apiKeyIndex = (hash: string) => `partnerkey:${hash}`;
const PARTNER_INDEX = "partners:index";

export async function createPartner(input: {
  name: string;
  billing: Partner["billing"];
  webhookUrl?: string;
}): Promise<{ partner: Partner; apiKey: string }> {
  const kv = getKV();
  const id = `ptr_${randomBytes(6).toString("hex")}`;
  const apiKey = `irie_live_${randomBytes(24).toString("base64url")}`;
  const partner: Partner = {
    id,
    name: input.name,
    billing: input.billing,
    webhookUrl: input.webhookUrl,
    webhookSecret: input.webhookUrl ? `whsec_${randomBytes(24).toString("base64url")}` : undefined,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await kv.set(partnerKey(id), partner);
  await kv.set(apiKeyIndex(sha256(apiKey)), id);
  await kv.zadd(PARTNER_INDEX, Date.now(), id);
  return { partner, apiKey };
}

export async function listPartners(): Promise<Partner[]> {
  const kv = getKV();
  const ids = await kv.zrevrange(PARTNER_INDEX, 0, 199);
  const partners = await Promise.all(ids.map((id) => kv.get<Partner>(partnerKey(id))));
  return partners.filter((p): p is Partner => !!p);
}

export async function getPartner(id: string): Promise<Partner | null> {
  return getKV().get<Partner>(partnerKey(id));
}

/** Resolves `Authorization: Bearer irie_live_…` to an active partner. */
export async function authenticatePartner(req: Request): Promise<Partner | null> {
  const token = bearerToken(req);
  if (!token || !token.startsWith("irie_")) return null;
  const id = await getKV().get<string>(apiKeyIndex(sha256(token)));
  if (!id) return null;
  const partner = await getPartner(id);
  return partner?.active ? partner : null;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

/**
 * Signature scheme (documented in docs/PARTNER_API.md):
 *   Irie-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>
 */
export function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

export async function sendPartnerWebhook(partner: Partner, event: string, data: Record<string, unknown>): Promise<boolean> {
  if (!partner.webhookUrl || !partner.webhookSecret) return false;
  const body = JSON.stringify({ id: `evt_${randomBytes(8).toString("hex")}`, type: event, created: new Date().toISOString(), data });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(partner.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Irie-Signature": signWebhook(partner.webhookSecret, body) },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return true;
      if (res.status < 500 && res.status !== 429) break; // partner rejected it; don't hammer
    } catch (err) {
      console.warn(`Partner webhook ${partner.id} attempt ${attempt + 1} failed:`, err);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
  console.error(`Partner webhook ${partner.id} ${event} could not be delivered`);
  return false;
}
