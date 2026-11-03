import type { Verification } from "@/types/trip";

/**
 * Venue verification against Google Places API (New).
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Needs GOOGLE_MAPS_API_KEY (server-side key with "Places API (New)" enabled —
 * not the browser key). Without it, venues keep their web-research status.
 */

const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.businessStatus",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.regularOpeningHours",
  "places.location",
].join(",");

export interface OpeningPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  regularOpeningHours?: { periods?: OpeningPeriod[]; weekdayDescriptions?: string[] };
  location?: { latitude: number; longitude: number };
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function placesEnabled(): boolean {
  return !!(process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY);
}

async function searchText(query: string, bias?: LatLng, maxResultCount = 3): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const body: Record<string, unknown> = { textQuery: query, maxResultCount };
  if (bias) body.locationBias = { circle: { center: bias, radius: 50_000 } };
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    console.error(`Places search failed (${res.status}):`, (await res.text()).slice(0, 300));
    throw new Error(`Places API ${res.status}`);
  }
  const data = (await res.json()) as { places?: PlaceResult[] };
  return data.places ?? [];
}

/** Center of the destination, used to bias venue lookups to the right town. */
export async function locateDestination(destination: string): Promise<LatLng | undefined> {
  try {
    const [first] = await searchText(destination, undefined, 1);
    return first?.location;
  } catch {
    return undefined;
  }
}

const STOP_WORDS = new Set(["the", "a", "an", "and", "&", "of", "at", "on", "in", "restaurant", "cafe", "café", "bar", "grill", "kitchen", "co", "company"]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t));
}

/** How closely a Google result's name matches the venue we asked about (0–1). */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface VerifyResult {
  verification: Verification;
  periods?: OpeningPeriod[];
  /** Kilometres from the destination center, when known. */
  distanceKm?: number;
}

/**
 * Looks a venue up on Google and reports whether it exists, is operating, and
 * when it's open. A weak name match is treated as "not found" rather than
 * risking a confident answer about a different business.
 */
export async function verifyVenue(
  venue: { name: string; address?: string | null },
  destination: string,
  center?: LatLng
): Promise<VerifyResult | null> {
  if (!placesEnabled()) return null;
  const checkedAt = new Date().toISOString();
  const query = [venue.name, venue.address || destination].filter(Boolean).join(", ");
  let results: PlaceResult[];
  try {
    results = await searchText(query, center);
  } catch {
    return null; // Provider error — leave the venue's web status untouched.
  }

  const scored = results
    .map((p) => ({ p, score: nameSimilarity(venue.name, p.displayName?.text ?? "") }))
    .sort((x, y) => y.score - x.score);
  const best = scored[0];
  if (!best || best.score < 0.6) {
    return { verification: { status: "unverified", provider: "google_places", checkedAt } };
  }

  const p = best.p;
  const km = center && p.location ? distanceKm(center, p.location) : undefined;
  const closed = p.businessStatus === "CLOSED_PERMANENTLY" || p.businessStatus === "CLOSED_TEMPORARILY";
  const periods = p.regularOpeningHours?.periods;
  const openDays = periods ? [...new Set(periods.map((x) => x.open.day))].sort() : undefined;

  return {
    periods,
    distanceKm: km,
    verification: {
      status: closed ? "closed" : "verified",
      provider: "google_places",
      checkedAt,
      placeId: p.id,
      mapsUrl: p.googleMapsUri,
      rating: p.rating,
      reviewCount: p.userRatingCount,
      address: p.formattedAddress,
      hours: p.regularOpeningHours?.weekdayDescriptions,
      openDays,
      website: p.websiteUri,
    },
  };
}

// ─── Opening-hours checks (pure) ─────────────────────────────────────────────

/** Minutes since Sunday 00:00. */
const weekMinute = (day: number, hour: number, minute: number) => day * 1440 + hour * 60 + minute;

/**
 * Whether a venue is open at a given weekday/time. Returns undefined when
 * hours are unknown. A period with no close time means open 24 hours.
 */
export function isOpenAt(periods: OpeningPeriod[] | undefined, day: number, hour: number, minute = 0): boolean | undefined {
  if (!periods || periods.length === 0) return undefined;
  if (periods.length === 1 && !periods[0].close) return true;
  const t = weekMinute(day, hour, minute);
  const WEEK = 7 * 1440;
  return periods.some((p) => {
    if (!p.close) return p.open.day === day;
    const start = weekMinute(p.open.day, p.open.hour, p.open.minute);
    let end = weekMinute(p.close.day, p.close.hour, p.close.minute);
    if (end <= start) end += WEEK; // wraps past Saturday night
    return (t >= start && t < end) || (t + WEEK >= start && t + WEEK < end);
  });
}

/** Parses "7:30pm", "19:00", "8am", "noon". */
export function parseClock(s: string | null | undefined): { hour: number; minute: number } | undefined {
  if (!s) return undefined;
  const v = s.trim().toLowerCase();
  if (v.startsWith("noon")) return { hour: 12, minute: 0 };
  const m = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
  if (!m) return undefined;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.replace(/\./g, "");
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return undefined;
  return { hour, minute };
}
