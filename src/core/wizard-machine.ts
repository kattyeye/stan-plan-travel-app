/**
 * Wizard field rules, independent of any UI.
 *
 * Both the 6-step wizard and the voice/natural-language intake need the same
 * answers: which fields are mandatory, what a sane default is, and what is
 * still missing. Keeping that here means the React Native app gets it for free
 * and the two intake paths can't drift.
 *
 * Platform-free — safe to import from React Native.
 */

import type { TripSection, WizardData } from "./types";

/**
 * Fields that must be answered before we can take money.
 *
 * Everything else has a defensible default. These do not: guessing a date or a
 * group size on a $19 non-refundable purchase is how you get chargebacks.
 */
export const REQUIRED_FIELDS = [
  "destination",
  "startDate",
  "endDate",
  "numAdults",
  "email",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export const FIELD_LABELS: Record<RequiredField, string> = {
  destination: "Where you're going",
  startDate: "Start date",
  endDate: "End date",
  numAdults: "How many adults",
  email: "Your email",
};

export const ALL_SECTIONS: TripSection[] = [
  "itinerary", "meals", "grocery", "restaurants", "activities", "packing",
];

export function isValidEmail(value: string | undefined): boolean {
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Which required fields are still unanswered, in the order to ask for them. */
export function missingRequiredFields(data: Partial<WizardData>): RequiredField[] {
  const missing: RequiredField[] = [];

  if (!data.destination?.trim()) missing.push("destination");
  if (!isIsoDate(data.startDate)) missing.push("startDate");
  if (!isIsoDate(data.endDate)) missing.push("endDate");
  if (typeof data.numAdults !== "number" || data.numAdults < 1) missing.push("numAdults");
  if (!isValidEmail(data.email)) missing.push("email");

  return missing;
}

export function isReadyToSubmit(data: Partial<WizardData>): boolean {
  return missingRequiredFields(data).length === 0;
}

/** Whole nights between two ISO dates, or 0 when either is unusable. */
export function calcNights(startDate?: string, endDate?: string): number {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return 0;
  const diff =
    new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
}

/**
 * Fill every optional field so downstream code never has to guess.
 *
 * Throws nothing — call `missingRequiredFields` first if you need validation.
 */
export function applyDefaults(data: Partial<WizardData>): WizardData {
  const destination = data.destination?.trim() ?? "";
  const numAdults = data.numAdults ?? 2;
  const numKids = data.numKids ?? 0;

  return {
    destination,
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    nights: data.nights || calcNights(data.startDate, data.endDate),
    tripType: data.tripType ?? "other",
    numAdults,
    numKids,
    kidAges: data.kidAges ?? [],
    planningStyle: data.planningStyle ?? "balanced",
    budget: data.budget ?? "moderate",
    vibes: data.vibes ?? [],
    travelMethod: data.travelMethod ?? "plane",
    cookInRatio: data.cookInRatio ?? "mix",
    dietaryRestrictions: data.dietaryRestrictions ?? [],
    cuisinePreferences: data.cuisinePreferences ?? [],
    propertyDescription: data.propertyDescription ?? "",
    propertyAmenities: data.propertyAmenities ?? [],
    bedrooms: data.bedrooms,
    sections: data.sections?.length ? data.sections : ALL_SECTIONS,
    email: data.email?.trim() ?? "",
    tripNickname: data.tripNickname?.trim() || destination,
  };
}
