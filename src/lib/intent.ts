import Anthropic from "@anthropic-ai/sdk";
import type { ParseIntentResult } from "@/core/intent";
import { FAST_MODEL } from "@/lib/models";
import { missingRequiredFields } from "@/core/wizard-machine";
import type {
  BudgetTier,
  CookInRatio,
  PlanningStyle,
  TravelMethod,
  TripVibe,
  WizardData,
} from "@/types/trip";

/**
 * Natural-language trip intake.
 *
 * Takes plain TEXT, never audio. That is the whole portability story: the web
 * sends text from the Web Speech API, React Native sends text from a native
 * recognizer, and this code cannot tell the difference.
 *
 * Model output is treated as untrusted and filtered against allowlists below —
 * same approach as /api/suggest — so a hallucinated value can never reach
 * WizardData.
 */

const VALID_VIBES: TripVibe[] = [
  "laid-back", "adventurous", "foodie", "nature",
  "cultural", "family-fun", "nightlife", "live-music",
];
const VALID_TRIP_TYPES = [
  "beach house", "ski cabin", "city trip", "national park",
  "cruise", "road trip", "honeymoon", "camping", "villa", "other",
];
const VALID_PLANNING_STYLES: PlanningStyle[] = ["structured", "balanced", "flexible"];
const VALID_BUDGETS: BudgetTier[] = ["budget", "moderate", "splurge"];
const VALID_TRAVEL_METHODS: TravelMethod[] = ["car", "plane", "train", "other"];
const VALID_COOK_RATIOS: CookInRatio[] = ["mostly-in", "mix", "mostly-out"];

const SYSTEM_PROMPT = `You extract structured trip details from a traveller speaking or typing freely.

Return valid JSON only. No markdown fences, no preamble, no explanation.

Extract ONLY what the traveller actually said or clearly implied. This is the
single most important rule: never invent a destination, a date, a group size or
an email. Omit a field entirely rather than guessing it. A missing field is
handled gracefully downstream; a wrong one means a refund.

Return this shape:
{
  "destination": "string — place name only, e.g. 'Nassau, Bahamas'",
  "startDate": "YYYY-MM-DD — only if an actual date was stated",
  "endDate": "YYYY-MM-DD — only if an actual date was stated",
  "nights": number,
  "tripType": "one of: beach house, ski cabin, city trip, national park, cruise, road trip, honeymoon, camping, villa, other",
  "numAdults": number,
  "numKids": number,
  "kidAges": [number],
  "bedrooms": number,
  "planningStyle": "structured | balanced | flexible",
  "budget": "budget | moderate | splurge",
  "vibes": ["laid-back","adventurous","foodie","nature","cultural","family-fun","nightlife","live-music"],
  "travelMethod": "car | plane | train | other",
  "cookInRatio": "mostly-in | mix | mostly-out",
  "dietaryRestrictions": ["string"],
  "cuisinePreferences": ["string"],
  "propertyDescription": "string — specific requests about the place to stay AND named activities they asked for",
  "interpretation": "one short sentence paraphrasing what you understood, second person",
  "unmapped": ["phrases you could not map to any field"]
}

Guidance:
- "I'm flexible" / "go with the flow" → planningStyle "flexible". "Plan every hour" → "structured".
- A duration with no dates ("4 days") → set "nights" and leave startDate/endDate out.
  Note: 4 days usually means 3 nights; prefer what they said if explicit.
- Named activities ("swim with stingrays") belong in propertyDescription AND should
  inform vibes (that example → "adventurous", "nature").
- "2 bedroom place" → bedrooms 2. Do not infer group size from bedrooms.
- Mentions of kids set numKids; only set kidAges if ages were stated.
- Omit any field not mentioned. Do not include a key with a null or empty value.`;

function pick<T extends string>(value: unknown, allowed: T[]): T | undefined {
  return typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : undefined;
}

function positiveInt(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded >= 1 && rounded <= max ? rounded : undefined;
}

function nonNegativeInt(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= max ? rounded : undefined;
}

function isoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) ? undefined : value;
}

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

function stringList(value: unknown, maxItems: number, maxLength = 60): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((v) => cleanString(v, maxLength))
    .filter((v): v is string => !!v)
    .slice(0, maxItems);
  return items.length ? items : undefined;
}

/** Drop keys whose value is undefined so `Partial<WizardData>` stays clean. */
function compact<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Filter raw model output down to values we recognize.
 *
 * Exported for testing — this is the security boundary, so it is worth
 * exercising directly with hostile input.
 */
export function sanitizeIntent(raw: unknown): { data: Partial<WizardData>; interpretation: string; unmapped: string[] } {
  const obj = (raw ?? {}) as Record<string, unknown>;

  const vibes = Array.isArray(obj.vibes)
    ? (obj.vibes.filter((v) => typeof v === "string" && (VALID_VIBES as string[]).includes(v)) as TripVibe[])
    : undefined;

  const kidAges = Array.isArray(obj.kidAges)
    ? obj.kidAges
        .map((age) => nonNegativeInt(age, 25))
        .filter((age): age is number => age !== undefined)
        .slice(0, 12)
    : undefined;

  const data = compact<Partial<WizardData>>({
    destination: cleanString(obj.destination, 120),
    startDate: isoDate(obj.startDate),
    endDate: isoDate(obj.endDate),
    nights: positiveInt(obj.nights, 60),
    tripType: pick(obj.tripType, VALID_TRIP_TYPES),
    numAdults: positiveInt(obj.numAdults, 30),
    numKids: nonNegativeInt(obj.numKids, 20),
    kidAges: kidAges?.length ? kidAges : undefined,
    bedrooms: positiveInt(obj.bedrooms, 20),
    planningStyle: pick(obj.planningStyle, VALID_PLANNING_STYLES),
    budget: pick(obj.budget, VALID_BUDGETS),
    vibes: vibes?.length ? vibes : undefined,
    travelMethod: pick(obj.travelMethod, VALID_TRAVEL_METHODS),
    cookInRatio: pick(obj.cookInRatio, VALID_COOK_RATIOS),
    dietaryRestrictions: stringList(obj.dietaryRestrictions, 12),
    cuisinePreferences: stringList(obj.cuisinePreferences, 12),
    propertyDescription: cleanString(obj.propertyDescription, 600),
  });

  return {
    data,
    interpretation: cleanString(obj.interpretation, 300) ?? "",
    unmapped: stringList(obj.unmapped, 6, 120) ?? [],
  };
}

/** Strip markdown fences Claude sometimes adds despite instructions. */
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
}

export async function parseIntent(text: string): Promise<ParseIntentResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });

  const rawText = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(rawText));
  } catch {
    console.error("parseIntent: model returned invalid JSON:", rawText.slice(0, 400));
    throw new Error("Could not understand that — try rephrasing.");
  }

  const { data, interpretation, unmapped } = sanitizeIntent(parsed);

  // Derive nights when both dates came through, so the wizard stays consistent.
  if (data.startDate && data.endDate && !data.nights) {
    const diff =
      new Date(`${data.endDate}T00:00:00Z`).getTime() -
      new Date(`${data.startDate}T00:00:00Z`).getTime();
    const nights = Math.round(diff / 86_400_000);
    if (nights > 0) data.nights = nights;
  }

  return { data, interpretation, unmapped, missing: missingRequiredFields(data) };
}
