import { z } from "zod";
import type { WizardData } from "@/types/trip";

/**
 * Server-side validation for anything that becomes a trip — from our own
 * wizard or from a partner integration. The client is never trusted: dates are
 * re-derived, free text is trimmed and length-capped, enums are enforced.
 */

export const MAX_NIGHTS = 21;
const MAX_TEXT = 1200;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const shortText = (max = 120) => z.string().trim().max(max);
const tagList = (max = 20) => z.array(shortText(60)).max(max).default([]);

export const PropertyContextSchema = z.object({
  source: z.enum(["manual", "airbnb", "vrbo", "booking", "partner"]).default("manual"),
  externalId: shortText(120).optional(),
  name: shortText(200).optional(),
  url: z.string().url().max(500).optional(),
  address: shortText(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  checkInTime: shortText(20).optional(),
  checkOutTime: shortText(20).optional(),
  maxGuests: z.number().int().min(1).max(50).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  kitchen: z.enum(["full", "kitchenette", "none"]).optional(),
  amenities: tagList(60),
  houseRules: z.array(shortText(200)).max(30).optional(),
  description: shortText(MAX_TEXT).optional(),
});

export const WizardInputSchema = z
  .object({
    destination: shortText(160).min(2, "Destination is required"),
    startDate: isoDate,
    endDate: isoDate,
    tripType: shortText(60).default("other"),
    numAdults: z.number().int().min(1).max(20).default(2),
    numKids: z.number().int().min(0).max(15).default(0),
    kidAges: z.array(z.number().int().min(0).max(17)).max(15).default([]),
    planningStyle: z.enum(["structured", "balanced", "flexible"]).default("balanced"),
    budget: z.enum(["budget", "moderate", "splurge"]).default("moderate"),
    vibes: z
      .array(z.enum(["laid-back", "adventurous", "foodie", "nature", "cultural", "family-fun", "nightlife", "live-music"]))
      .max(8)
      .default([]),
    travelMethod: z.enum(["car", "plane", "train", "other"]).default("car"),
    cookInRatio: z.enum(["mostly-in", "mix", "mostly-out"]).default("mix"),
    dietaryRestrictions: tagList(),
    cuisinePreferences: tagList(),
    propertyDescription: shortText(MAX_TEXT).default(""),
    propertyAmenities: tagList(40),
    sections: z
      .array(z.enum(["itinerary", "meals", "grocery", "restaurants", "activities", "packing"]))
      .default(["itinerary", "meals", "grocery", "restaurants", "activities", "packing"]),
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
    tripNickname: shortText(80).default(""),
    property: PropertyContextSchema.optional(),
  })
  .superRefine((d, ctx) => {
    const start = Date.parse(`${d.startDate}T00:00:00Z`);
    const end = Date.parse(`${d.endDate}T00:00:00Z`);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      ctx.addIssue({ code: "custom", path: ["startDate"], message: "Invalid dates" });
      return;
    }
    const nights = Math.round((end - start) / 86_400_000);
    if (nights < 1) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Trip must be at least one night" });
    if (nights > MAX_NIGHTS)
      ctx.addIssue({ code: "custom", path: ["endDate"], message: `Trips can be up to ${MAX_NIGHTS} nights` });
    // Allow "yesterday" to absorb time-zone differences.
    const yesterday = Date.now() - 2 * 86_400_000;
    if (start < yesterday) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date is in the past" });
  });

export type WizardInput = z.input<typeof WizardInputSchema>;

export function nightsBetween(startDate: string, endDate: string): number {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
}

/**
 * Validates and normalises raw input into WizardData. Partner-billed trips may
 * omit the guest's email (`requireEmail: false`); everything else is required.
 */
export function parseWizardData(
  raw: unknown,
  opts: { requireEmail?: boolean } = {}
): { ok: true; data: WizardData } | { ok: false; error: string; fields: Record<string, string> } {
  const requireEmail = opts.requireEmail ?? true;
  const input =
    !requireEmail && raw && typeof raw === "object" && !(raw as Record<string, unknown>).email
      ? { ...(raw as Record<string, unknown>), email: "no-reply@partner.invalid" }
      : raw;
  const result = WizardInputSchema.safeParse(input);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    const first = result.error.issues[0];
    return { ok: false, error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", fields };
  }
  const d = result.data;
  const numKids = d.numKids;
  const data: WizardData = {
    ...d,
    email: d.email === "no-reply@partner.invalid" ? "" : d.email,
    kidAges: d.kidAges.slice(0, numKids),
    nights: nightsBetween(d.startDate, d.endDate),
    tripNickname: d.tripNickname || d.destination,
    property: d.property,
  };
  return { ok: true, data };
}
