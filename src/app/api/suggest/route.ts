import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { FAST_MODEL } from "@/lib/models";

export const runtime = "nodejs";

const VALID_VIBES = new Set([
  "laid-back", "adventurous", "foodie", "nature",
  "cultural", "family-fun", "nightlife", "live-music",
]);

const VALID_TRIP_TYPES = new Set([
  "beach house", "ski cabin", "city trip", "national park",
  "cruise", "road trip", "honeymoon", "camping", "villa", "other",
]);

interface SuggestResponse {
  tripTypes: string[];
  vibes: string[];
  cuisines: string[];
  amenities: string[];
}

function getRedis(): Redis {
  const url = process.env.PLAN_UPSTASH_KV_REST_API_URL;
  const token = process.env.PLAN_UPSTASH_KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Redis env vars not set");
  return new Redis({ url, token });
}

function cacheKey(destination: string): string {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `suggest:${slug(destination)}`;
}

function sanitize(raw: SuggestResponse): SuggestResponse {
  return {
    tripTypes: (raw.tripTypes ?? []).filter((v) => typeof v === "string" && VALID_TRIP_TYPES.has(v)),
    vibes: (raw.vibes ?? []).filter((v) => typeof v === "string" && VALID_VIBES.has(v)),
    cuisines: (raw.cuisines ?? []).filter((v) => typeof v === "string" && v.length > 0),
    amenities: (raw.amenities ?? []).filter((v) => typeof v === "string" && v.length > 0),
  };
}

function withKids(result: SuggestResponse, numKids: number): SuggestResponse {
  if (numKids > 0 && !result.vibes.includes("family-fun")) {
    return { ...result, vibes: ["family-fun", ...result.vibes] };
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { destination, numKids = 0 } = body as {
      destination: string;
      numKids?: number;
    };

    if (!destination) {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }

    const key = cacheKey(destination);

    // Check cache first
    const redis = getRedis();
    const cached = await redis.get<SuggestResponse>(key);
    if (cached) {
      return NextResponse.json(withKids(cached, numKids));
    }

    // Call Claude Haiku
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userPrompt = `Destination: ${destination}
Kids in group: ${numKids > 0 ? "yes" : "no"}

Return JSON with exactly these keys:
{
  "tripTypes": [],
  "vibes": [],
  "cuisines": [],
  "amenities": []
}

Rules:
- tripTypes: choose 2-4 most fitting from this exact set only: beach house, ski cabin, city trip, national park, cruise, road trip, honeymoon, camping, villa, other — pick what actually makes sense for this destination (e.g. Winston-Salem NC → city trip, road trip; Outer Banks NC → beach house, villa; Aspen CO → ski cabin, villa)
- vibes: choose 4-6 from this exact set only: laid-back, adventurous, foodie, nature, cultural, family-fun, nightlife, live-music
- cuisines: 4-7 cuisine styles most prominent in this destination's actual local food scene — be specific (e.g. "Eastern NC BBQ" not "BBQ", "Tex-Mex" not "Mexican")
- amenities: 4-8 property amenities relevant to this geography — beach destinations get beach access/outdoor shower/kayaks; mountain/ski destinations get hot tub/fire pit/ski storage; city trips get washer/dryer/game room
- If kids = yes, include "family-fun" in vibes
- Return valid JSON only. No explanation.`;

    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 300,
      system: "You are a concise travel context engine. Return JSON only. No prose, no markdown fences.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const parsed = JSON.parse(cleaned) as SuggestResponse;
    const result = sanitize(parsed);

    // Cache without kids injection (TTL: 7 days)
    await redis.set(key, result, { ex: 604800 });

    return NextResponse.json(withKids(result, numKids));
  } catch (err) {
    console.error("suggest route error:", err);
    return NextResponse.json({ error: "suggestion_failed" }, { status: 500 });
  }
}
