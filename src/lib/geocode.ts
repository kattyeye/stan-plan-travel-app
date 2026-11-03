/**
 * Destination autocomplete, served from our own API so the browser needs no
 * Google key.
 *
 * Providers:
 *  - "photon" (default): Komoot's free OpenStreetMap geocoder. No key, no cost;
 *    fair-use limits apply, so results are cached and requests rate-limited.
 *  - "google": Places API (New) Autocomplete via GOOGLE_MAPS_API_KEY. Billed per
 *    request by Google — opt in with IRIE_AUTOCOMPLETE_PROVIDER=google.
 */

export interface DestinationSuggestion {
  id: string;
  /** What goes in the input when chosen, e.g. "Corfu, Greece". */
  label: string;
  mainText: string;
  secondaryText: string;
}

export type GeocodeProvider = "photon" | "google";

export function autocompleteProvider(): GeocodeProvider {
  return process.env.IRIE_AUTOCOMPLETE_PROVIDER === "google" && process.env.GOOGLE_MAPS_API_KEY ? "google" : "photon";
}

const USER_AGENT = "IrieTripPlanner/1.0 (+https://irietravel.app)";

// ─── Photon (OpenStreetMap) ──────────────────────────────────────────────────

interface PhotonFeature {
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    state?: string;
    county?: string;
    country?: string;
    type?: string;
  };
}

/** Places people travel to: towns, islands, regions, parks — not streets or shops. */
const PLACE_KEYS = new Set(["place", "boundary"]);
const SKIP_VALUES = new Set(["house", "postcode", "plot", "farm", "isolated_dwelling", "allotments", "quarter", "city_block"]);

export function parsePhoton(json: unknown, limit = 6): DestinationSuggestion[] {
  const features = (json as { features?: PhotonFeature[] })?.features ?? [];
  const seen = new Set<string>();
  const out: DestinationSuggestion[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    if (!p.name || !p.osm_key || !PLACE_KEYS.has(p.osm_key) || (p.osm_value && SKIP_VALUES.has(p.osm_value))) continue;
    const context = [p.state && p.state !== p.name ? p.state : undefined, p.country && p.country !== p.name ? p.country : undefined].filter(
      (x): x is string => !!x
    );
    const label = [p.name, ...context].join(", ");
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ id: `osm:${p.osm_type ?? ""}${p.osm_id ?? label}`, label, mainText: p.name, secondaryText: context.join(", ") });
    if (out.length >= limit) break;
  }
  return out;
}

async function photon(q: string): Promise<DestinationSuggestion[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12&lang=en`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  return parsePhoton(await res.json());
}

// ─── Google Places API (New) ─────────────────────────────────────────────────

interface GooglePrediction {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
    structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
  };
}

export function parseGoogle(json: unknown, limit = 6): DestinationSuggestion[] {
  const suggestions = (json as { suggestions?: GooglePrediction[] })?.suggestions ?? [];
  return suggestions
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<GooglePrediction["placePrediction"]> => !!p?.placeId)
    .slice(0, limit)
    .map((p) => {
      const main = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
      const secondary = p.structuredFormat?.secondaryText?.text ?? "";
      return { id: `g:${p.placeId}`, label: p.text?.text ?? [main, secondary].filter(Boolean).join(", "), mainText: main, secondaryText: secondary };
    });
}

async function google(q: string, sessionToken?: string): Promise<DestinationSuggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY! },
    body: JSON.stringify({ input: q, includedPrimaryTypes: ["(regions)"], ...(sessionToken ? { sessionToken } : {}) }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`Places autocomplete ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return parseGoogle(await res.json());
}

export async function searchDestinations(q: string, sessionToken?: string): Promise<DestinationSuggestion[]> {
  return autocompleteProvider() === "google" ? google(q, sessionToken) : photon(q);
}
