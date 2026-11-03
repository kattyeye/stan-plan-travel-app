import { NextResponse } from "next/server";
import { MODELS, generateStructured } from "@/lib/claude";
import { getKV } from "@/lib/kv";
import { SuggestSchema } from "@/lib/pipeline/schemas";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";

const VALID_VIBES = new Set(["laid-back", "adventurous", "foodie", "nature", "cultural", "family-fun", "nightlife", "live-music"]);
const VALID_TRIP_TYPES = new Set(["beach house", "ski cabin", "city trip", "national park", "cruise", "road trip", "honeymoon", "camping", "villa", "other"]);

interface SuggestResponse {
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

export async function POST(req: Request) {
  const limit = await rateLimit("suggest", clientIp(req), 30, 600);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = (await req.json().catch(() => ({}))) as { destination?: unknown; numKids?: unknown };
  const destination = typeof body.destination === "string" ? body.destination.trim().slice(0, 160) : "";
  const numKids = typeof body.numKids === "number" ? body.numKids : 0;
  if (destination.length < 2) return NextResponse.json({ error: "destination is required" }, { status: 400 });

  const key = cacheKey(destination);
  try {
    const cached = await getKV().get<SuggestResponse>(key);
    if (cached) return NextResponse.json(withKids(cached, numKids));
  } catch (err) {
    console.warn("suggest cache read failed:", err);
  }

  try {
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
    return NextResponse.json(withKids(result, numKids));
  } catch (err) {
    console.error("suggest route error:", err);
    return NextResponse.json({ error: "suggestion_failed" }, { status: 500 });
  }
}

