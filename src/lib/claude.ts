import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";
import { WizardData, GeneratedTrip } from "@/types/trip";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-20250514";

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
    numAdults,
    numKids,
    kidAges,
    planningStyle,
    budget,
    vibes,
    travelMethod,
    cookInRatio,
    dietaryRestrictions,
    cuisinePreferences,
    propertyDescription,
    propertyAmenities,
    sections,
    tripNickname,
  } = wizardData;

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

Generate a complete, specific, and genuinely useful trip plan for this group. Use web search to verify all restaurants are real and currently operating at this destination. Scale all recipes to serve ${totalPeople} people exactly.`;
}

export async function generateTripJSON(wizardData: WizardData): Promise<GeneratedTrip> {
  const [systemPrompt, schemaPrompt] = await Promise.all([
    loadPrompt("system.txt"),
    loadPrompt("json-schema.txt"),
  ]);

  const userPrompt = buildUserPrompt(wizardData);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: `${systemPrompt}\n\n${schemaPrompt}`,
    messages: [{ role: "user", content: userPrompt }],
  });

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

  return parsed;
}

export async function generateTripHTML(trip: GeneratedTrip): Promise<string> {
  const [systemPrompt, htmlTemplate] = await Promise.all([
    loadPrompt("system.txt"),
    loadPrompt("html-template.txt"),
  ]);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: `${systemPrompt}\n\n${htmlTemplate}\n\nReturn valid HTML only. No markdown, no preamble, no explanation. Start with <!DOCTYPE html>.`,
    messages: [
      {
        role: "user",
        content: `Render this trip plan as a self-contained HTML file:\n\n${JSON.stringify(trip, null, 2)}`,
      },
    ],
  });

  const html = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return html.trim();
}
