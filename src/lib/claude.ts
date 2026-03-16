import Anthropic from "@anthropic-ai/sdk";
import { WizardData, GeneratedTrip } from "@/types/trip";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateTripJSON(wizardData: WizardData): Promise<GeneratedTrip> {
  // TODO: load prompts, call Claude API, parse JSON response
  throw new Error("Not implemented yet");
}

export async function generateTripHTML(trip: GeneratedTrip): Promise<string> {
  // TODO: load html-template.txt, call Claude with trip JSON, return HTML string
  throw new Error("Not implemented yet");
}

export function buildUserPrompt(wizardData: WizardData): string {
  // TODO: assemble prompt from wizard data
  return "";
}
