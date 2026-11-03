import { randomUUID } from "crypto";
import { getKV } from "./kv";
import type {
  GeneratedTrip,
  PartnerRef,
  TripProgress,
  TripRecord,
  TripStatus,
  WizardData,
} from "@/types/trip";

// ─── Keys ────────────────────────────────────────────────────────────────────

const tripKey = (slug: string) => `trip:${slug}`;
const sessionKey = (sessionId: string) => `session:${sessionId}`;
const pipelineKey = (slug: string) => `pipeline:${slug}`;
const lockKey = (name: string) => `lock:${name}`;
const TRIP_INDEX = "trips:index";

// ─── Trips ───────────────────────────────────────────────────────────────────

export async function getTripBySlug(slug: string): Promise<TripRecord | null> {
  if (!/^[a-z0-9]{6,32}$/i.test(slug)) return null;
  return getKV().get<TripRecord>(tripKey(slug));
}

export async function getTripByStripeSession(sessionId: string): Promise<TripRecord | null> {
  const slug = await getKV().get<string>(sessionKey(sessionId));
  return slug ? getTripBySlug(slug) : null;
}

export async function createTrip(data: {
  slug: string;
  email: string;
  tripNickname: string;
  wizardData: WizardData;
  stripeSessionId?: string;
  status?: TripStatus;
  billing?: TripRecord["billing"];
  partner?: PartnerRef;
}): Promise<TripRecord> {
  const kv = getKV();
  const now = new Date().toISOString();

  const record: TripRecord = {
    id: Date.now(),
    slug: data.slug,
    email: data.email,
    tripNickname: data.tripNickname,
    status: data.status ?? "pending",
    wizardData: data.wizardData,
    stripeSessionId: data.stripeSessionId,
    billing: data.billing,
    partner: data.partner,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(tripKey(data.slug), record);
  await kv.zadd(TRIP_INDEX, Date.parse(now), data.slug);
  if (data.stripeSessionId) await kv.set(sessionKey(data.stripeSessionId), data.slug);
  if (data.partner) await kv.zadd(`partner:${data.partner.partnerId}:trips`, Date.parse(now), data.slug);

  return record;
}

/**
 * Read-modify-write a trip. Pipeline stages hold a lock while they write, so
 * concurrent writers are limited to small status/progress updates.
 */
export async function updateTrip(
  slug: string,
  patch: Partial<TripRecord> | ((trip: TripRecord) => Partial<TripRecord>)
): Promise<TripRecord> {
  const kv = getKV();
  const trip = await getTripBySlug(slug);
  if (!trip) throw new Error(`Trip not found: ${slug}`);
  const changes = typeof patch === "function" ? patch(trip) : patch;
  const next: TripRecord = { ...trip, ...changes, updatedAt: new Date().toISOString() };
  await kv.set(tripKey(slug), next);
  return next;
}

export async function updateTripStatus(
  slug: string,
  status: TripStatus,
  extra: Partial<TripRecord> = {}
): Promise<TripRecord> {
  return updateTrip(slug, { status, ...extra });
}

export async function setTripProgress(slug: string, progress: Omit<TripProgress, "updatedAt">) {
  return updateTrip(slug, (trip) => ({
    progress: {
      ...progress,
      startedAt: progress.startedAt ?? trip.progress?.startedAt,
      updatedAt: new Date().toISOString(),
    },
  }));
}

export async function updateTripStripeSession(slug: string, stripeSessionId: string): Promise<void> {
  await updateTrip(slug, { stripeSessionId });
  await getKV().set(sessionKey(stripeSessionId), slug);
}

export async function saveTripData(slug: string, generatedData: GeneratedTrip): Promise<TripRecord> {
  return updateTrip(slug, {
    generatedData,
    status: "ready",
    errorMessage: undefined,
    htmlBlob: undefined,
    progress: {
      stage: "done",
      message: "Your plan is ready",
      percent: 100,
      updatedAt: new Date().toISOString(),
    },
  });
}

/** Newest first. Backfills the index from legacy keys the first time it runs. */
export async function listTrips(offset = 0, limit = 50): Promise<{ trips: TripRecord[]; total: number }> {
  const kv = getKV();
  let total = await kv.zcard(TRIP_INDEX);
  if (total === 0) {
    const keys = (await kv.keys("trip:*")).filter((k) => k.split(":").length === 2);
    for (const key of keys) {
      const trip = await kv.get<TripRecord>(key);
      if (trip) await kv.zadd(TRIP_INDEX, Date.parse(trip.createdAt) || trip.id, trip.slug);
    }
    total = await kv.zcard(TRIP_INDEX);
  }
  const slugs = await kv.zrevrange(TRIP_INDEX, offset, offset + limit - 1);
  const trips = await Promise.all(slugs.map((s) => kv.get<TripRecord>(tripKey(s))));
  return { trips: trips.filter((t): t is TripRecord => !!t), total };
}

export async function listPartnerTrips(partnerId: string, limit = 50): Promise<TripRecord[]> {
  const kv = getKV();
  const slugs = await kv.zrevrange(`partner:${partnerId}:trips`, 0, limit - 1);
  const trips = await Promise.all(slugs.map((s) => kv.get<TripRecord>(tripKey(s))));
  return trips.filter((t): t is TripRecord => !!t);
}

// ─── Pipeline checkpoints ────────────────────────────────────────────────────

export async function getPipelineState<T>(slug: string): Promise<T | null> {
  return getKV().get<T>(pipelineKey(slug));
}

export async function savePipelineState<T>(slug: string, state: T): Promise<void> {
  // Checkpoints are only needed while a trip is being built.
  await getKV().set(pipelineKey(slug), state, { ex: 60 * 60 * 24 * 7 });
}

export async function clearPipelineState(slug: string): Promise<void> {
  await getKV().del(pipelineKey(slug));
}

// ─── Locks & idempotency ─────────────────────────────────────────────────────

/** Returns a token when acquired, null when someone else holds the lock. */
export async function acquireLock(name: string, ttlSeconds: number): Promise<string | null> {
  const token = randomUUID();
  const ok = await getKV().set(lockKey(name), token, { ex: ttlSeconds, nx: true });
  return ok ? token : null;
}

export async function releaseLock(name: string, token: string): Promise<void> {
  const kv = getKV();
  const current = await kv.get<string>(lockKey(name));
  if (current === token) await kv.del(lockKey(name));
}

export async function isLocked(name: string): Promise<boolean> {
  return (await getKV().get<string>(lockKey(name))) !== null;
}

/** True the first time an id is seen (e.g. a Stripe event), false on replays. */
export async function claimOnce(namespace: string, id: string, ttlSeconds = 60 * 60 * 24 * 7): Promise<boolean> {
  return getKV().set(`once:${namespace}:${id}`, 1, { ex: ttlSeconds, nx: true });
}
