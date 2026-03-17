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
