import { Redis } from "@upstash/redis";
import { TripRecord, TripStatus, WizardData, GeneratedTrip } from "@/types/trip";

function getRedis(): Redis {
  const url = process.env.PLAN_UPSTASH_KV_REST_API_URL;
  const token = process.env.PLAN_UPSTASH_KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("PLAN_UPSTASH_KV_REST_API_URL and PLAN_UPSTASH_KV_REST_API_TOKEN must be set");
  }
  return new Redis({ url, token });
}

function tripKey(slug: string) {
  return `trip:${slug}`;
}

function sessionKey(sessionId: string) {
  return `session:${sessionId}`;
}

function generationLockKey(slug: string) {
  return `lock:generate:${slug}`;
}

// ─── Generation lock ─────────────────────────────────────────────────────────

/**
 * Claim the exclusive right to generate this trip.
 *
 * Two independent paths can start generation for the same slug: the Stripe
 * webhook on `checkout.session.completed`, and the generating page when it
 * sees a trip still marked "pending". If the page loads before the webhook
 * lands, both fire — two full Claude generations for one purchase, with the
 * slower one overwriting the faster.
 *
 * SET NX is atomic in Redis, so exactly one caller wins. The TTL is a little
 * longer than the 300s function limit so a crashed run cannot wedge the slug
 * forever.
 */
export async function acquireGenerationLock(slug: string, ttlSeconds = 360): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.set(generationLockKey(slug), new Date().toISOString(), {
    nx: true,
    ex: ttlSeconds,
  });
  return result === "OK";
}

/** Release the lock so a failed run can be retried without waiting for the TTL. */
export async function releaseGenerationLock(slug: string): Promise<void> {
  const redis = getRedis();
  await redis.del(generationLockKey(slug));
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getTripBySlug(slug: string): Promise<TripRecord | null> {
  const redis = getRedis();
  return redis.get<TripRecord>(tripKey(slug));
}

export async function getTripByStripeSession(sessionId: string): Promise<TripRecord | null> {
  const redis = getRedis();
  const slug = await redis.get<string>(sessionKey(sessionId));
  if (!slug) return null;
  return getTripBySlug(slug);
}

export async function createTrip(data: {
  slug: string;
  email: string;
  tripNickname: string;
  wizardData: WizardData;
  stripeSessionId?: string;
}): Promise<TripRecord> {
  const redis = getRedis();
  const now = new Date().toISOString();

  const record: TripRecord = {
    id: Date.now(),
    slug: data.slug,
    email: data.email,
    tripNickname: data.tripNickname,
    status: "pending",
    wizardData: data.wizardData,
    stripeSessionId: data.stripeSessionId,
    createdAt: now,
    updatedAt: now,
  };

  await redis.set(tripKey(data.slug), record);

  // Index by Stripe session ID so the webhook can look it up
  if (data.stripeSessionId) {
    await redis.set(sessionKey(data.stripeSessionId), data.slug);
  }

  return record;
}

export async function updateTripStatus(slug: string, status: TripStatus): Promise<void> {
  const redis = getRedis();
  const trip = await getTripBySlug(slug);
  if (!trip) throw new Error(`Trip not found: ${slug}`);
  await redis.set(tripKey(slug), { ...trip, status, updatedAt: new Date().toISOString() });
}

export async function updateTripStripeSession(slug: string, stripeSessionId: string): Promise<void> {
  const redis = getRedis();
  const trip = await getTripBySlug(slug);
  if (!trip) throw new Error(`Trip not found: ${slug}`);
  await redis.set(tripKey(slug), { ...trip, stripeSessionId, updatedAt: new Date().toISOString() });
  await redis.set(sessionKey(stripeSessionId), slug);
}

export async function saveTripData(
  slug: string,
  generatedData: GeneratedTrip,
  htmlBlob?: string
): Promise<void> {
  const redis = getRedis();
  const trip = await getTripBySlug(slug);
  if (!trip) throw new Error(`Trip not found: ${slug}`);
  await redis.set(tripKey(slug), {
    ...trip,
    generatedData,
    htmlBlob,
    status: "ready" as TripStatus,
    updatedAt: new Date().toISOString(),
  });
}

export async function listAllTrips(): Promise<TripRecord[]> {
  const redis = getRedis();
  const keys = await redis.keys("trip:*");
  if (keys.length === 0) return [];
  const records = await Promise.all(keys.map((k) => redis.get<TripRecord>(k)));
  return (records.filter(Boolean) as TripRecord[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getTripHtml(slug: string): Promise<string | null> {
  const redis = getRedis();
  const trip = await redis.get<TripRecord & { htmlBlob?: string }>(tripKey(slug));
  return trip?.htmlBlob ?? null;
}
