import { MODELS, generateStructured } from "./claude";
import { getKV } from "./kv";
import { SuggestSchema } from "./pipeline/schemas";
import { TRIP_TYPES, VIBES } from "./options";

/**
 * Destination-aware wizard suggestions (which trip types, vibes, cuisines and
 * amenities fit a place). Cached for 30 days per destination. Shared by the
 * website (/api/suggest) and the client API (/api/v1/client/suggestions).
 */

const VALID_VIBES = new Set<string>(VIBES.map((v) => v.value));
const VALID_TRIP_TYPES = new Set<string>(TRIP_TYPES.map((t) => t.value));

export interface SuggestResponse {
  tripTypes: string[];
  vibes: string[];
  cuisines: string[];
  amenities: string[];
}

function cacheKey(destination: string): string {
  return `suggest:v2:${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function sanitize(raw: SuggestResponse): SuggestResponse {
  const clean = (xs: string[], max: number) => [...new Set(xs.map((x) => x.trim()).filter((x) => x && x.length <= 40))].slice(0, max);
  return {
    tripTypes: raw.tripTypes.filter((v) => VALID_TRIP_TYPES.has(v)),
    vibes: raw.vibes.filter((v) => VALID_VIBES.has(v)),
    cuisines: clean(raw.cuisines, 7),
    amenities: clean(raw.amenities, 8),
  };
}

function withKids(result: SuggestResponse, numKids: number): SuggestResponse {
  return numKids > 0 && !result.vibes.includes("family-fun") ? { ...result, vibes: ["family-fun", ...result.vibes] } : result;
}

const SYSTEM = "You tailor a trip-planning form to a destination. Be specific to the real place; never generic.";

export async function suggestForDestination(rawDestination: string, numKids = 0): Promise<SuggestResponse> {
  const destination = rawDestination.trim().slice(0, 160);
  const key = cacheKey(destination);
  try {
    const cached = await getKV().get<SuggestResponse>(key);
    if (cached) return withKids(cached, numKids);
  } catch (err) {
    console.warn("suggest cache read failed:", err);
  }
    const { data } = await generateStructured({
      label: "suggest",
      model: MODELS.fast,
      system: SYSTEM,
      prompt: `Destination: ${destination}

- tripTypes: the 2–4 that genuinely fit, chosen only from: ${[...VALID_TRIP_TYPES].join(", ")}. (Winston-Salem NC → city trip, road trip; Outer Banks NC → beach house, villa; Aspen CO → ski cabin, villa.)
- vibes: 4–6 that this place does well, chosen only from: ${[...VALID_VIBES].join(", ")}.
- cuisines: 4–7 styles that define the real local food scene, specific ("Eastern NC barbecue", not "BBQ").
- amenities: 4–8 rental amenities that matter here (beach towns: beach access, outdoor shower, kayaks; mountains: hot tub, fire pit, ski storage; cities: washer/dryer, parking).`,
      schema: SuggestSchema,
      maxTokens: 4_000,
      effort: "low",
      timeoutMs: 30_000,
    });
    const result = sanitize(data);
  await getKV().set(key, result, { ex: 60 * 60 * 24 * 30 }).catch(() => {});
  return withKids(result, numKids);
}
