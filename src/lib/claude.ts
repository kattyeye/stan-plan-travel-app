import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";
import { WizardData, GeneratedTrip } from "@/types/trip";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5-20251001"; // dev: swap to claude-sonnet-4-20250514 for production

async function loadPrompt(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "src", "prompts", filename);
  return readFile(filePath, "utf-8");
}

export function buildUserPrompt(wizardData: WizardData): string {
  const {
    destination,
    startDate,
    endDate,
    nights,
    tripType,
    planningStyle,
    budget,
    travelMethod,
    cookInRatio,
    propertyDescription,
    tripNickname,
  } = wizardData;

  // Safe defaults for optional/array fields so .join() never throws
  const numAdults = wizardData.numAdults ?? 2;
  const numKids = wizardData.numKids ?? 0;
  const kidAges = wizardData.kidAges ?? [];
  const vibes = wizardData.vibes ?? [];
  const dietaryRestrictions = wizardData.dietaryRestrictions ?? [];
  const cuisinePreferences = wizardData.cuisinePreferences ?? [];
  const propertyAmenities = wizardData.propertyAmenities ?? [];
  const sections = wizardData.sections ?? ["itinerary", "meals", "grocery", "restaurants", "activities", "packing"];

  const totalPeople = numAdults + numKids;
  const kidsLine = numKids > 0
    ? `${numKids} kids (ages: ${kidAges.length > 0 ? kidAges.join(", ") : "unspecified"})`
    : "no kids";
  const dietLine = dietaryRestrictions.length > 0
    ? dietaryRestrictions.join(", ")
    : "none";
  const cuisineLine = cuisinePreferences.length > 0
    ? cuisinePreferences.join(", ")
    : "no preference";
  const amenitiesLine = propertyAmenities.length > 0
    ? propertyAmenities.join(", ")
    : "unknown";
  const sectionsLine = sections.join(", ");

  return `Plan a trip with the following details:

TRIP: ${tripNickname || destination}
DESTINATION: ${destination}
DATES: ${startDate} to ${endDate} (${nights} nights)
TYPE: ${tripType}
TRAVEL METHOD: ${travelMethod}

GROUP:
- ${numAdults} adults, ${kidsLine}
- Total: ${totalPeople} people

PREFERENCES:
- Planning style: ${planningStyle}
- Budget: ${budget}
- Vibes: ${vibes.join(", ")}

FOOD:
- Cook-in ratio: ${cookInRatio}
- Dietary restrictions: ${dietLine}
- Cuisine preferences: ${cuisineLine}

PROPERTY:
- Description: ${propertyDescription || "vacation rental"}
- Amenities: ${amenitiesLine}

SECTIONS TO INCLUDE: ${sectionsLine}

Generate a complete, specific, and genuinely useful trip plan for this group. Use web search to verify all restaurants are real and currently operating at this destination. Scale all recipes to serve ${totalPeople} people exactly.

IMPORTANT — property description sanity check: The property description above was typed by the user and may contain amenities that are geographically impossible or irrelevant (e.g. "beach access" for an inland city, "ski-in/ski-out" for a beach town). Before writing the plan, silently discard any amenities that don't make sense for ${destination} and only reference the ones that are plausible. Do not mention or flag the discrepancy — just build the plan around the amenities that actually apply.`;
}

async function fetchPlaceWebsite(name: string, address: string): Promise<string | undefined> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return undefined;
  try {
    const query = encodeURIComponent(`${name} ${address}`);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=website,formatted_address&key=${apiKey}`
    );
    const data = await res.json();
    return data?.candidates?.[0]?.website ?? undefined;
  } catch {
    return undefined;
  }
}

async function enrichRestaurants(trip: GeneratedTrip): Promise<GeneratedTrip> {
  if (!process.env.GOOGLE_MAPS_API_KEY) return trip;
  const enriched = await Promise.all(
    trip.restaurants.map(async (r) => {
      if (r.link) return r; // already has a website, skip
      const website = await fetchPlaceWebsite(r.name, r.address ?? "");
      return website ? { ...r, link: website } : r;
    })
  );
  return { ...trip, restaurants: enriched };
}

export async function generateTripJSON(wizardData: WizardData): Promise<GeneratedTrip> {
  const [systemPrompt, schemaPrompt] = await Promise.all([
    loadPrompt("system.txt"),
    loadPrompt("json-schema.txt"),
  ]);

  const userPrompt = buildUserPrompt(wizardData);

  const response = await client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: `${systemPrompt}\n\n${schemaPrompt}`,
    messages: [{ role: "user", content: userPrompt }],
  }).finalMessage();

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Strip markdown fences if Claude wraps in them despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  let parsed: GeneratedTrip;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("Claude returned invalid JSON:", cleaned.slice(0, 500));
    throw new Error("Claude returned malformed JSON");
  }

  return enrichRestaurants(parsed);
}

export async function generateTripHTML(trip: GeneratedTrip): Promise<string> {
  const [systemPrompt, htmlTemplate] = await Promise.all([
    loadPrompt("system.txt"),
    loadPrompt("html-template.txt"),
  ]);

  const response = await client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: `${systemPrompt}\n\n${htmlTemplate}\n\nReturn valid HTML only. No markdown, no preamble, no explanation. Start with <!DOCTYPE html>.`,
    messages: [
      {
        role: "user",
        content: `Render this trip plan as a self-contained HTML file:\n\n${JSON.stringify(trip, null, 2)}`,
      },
    ],
  }).finalMessage();

  const html = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return html.trim();
}
