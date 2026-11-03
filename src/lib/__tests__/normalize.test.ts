import { describe, expect, it } from "vitest";
import type { Recipe } from "@/types/trip";
import { buildDays } from "../pipeline/days";
import { assembleTrip, buildVenues, normalizePlan, normalizeRecipes } from "../pipeline/normalize";
import type { VerifyResult } from "../places";
import { brief, plan, wizard } from "./fixtures";

const none = (b = brief()) => ({
  restaurants: b.restaurants.map((): VerifyResult | null => null),
  activities: b.activities.map((): VerifyResult | null => null),
  stores: b.groceryStores.map((): VerifyResult | null => null),
});

describe("calendar", () => {
  it("covers arrival through departure with computed weekdays", () => {
    const days = buildDays("2030-06-14", 3);
    expect(days.map((d) => `${d.date} ${d.weekday}`)).toEqual([
      "2030-06-14 Friday",
      "2030-06-15 Saturday",
      "2030-06-16 Sunday",
      "2030-06-17 Monday",
    ]);
  });
});

describe("buildVenues", () => {
  it("assigns stable ids, dedupes, and marks web-sourced places", () => {
    const v = buildVenues(brief(), none());
    expect(v.restaurants.map((r) => r.id)).toEqual(["rest-1", "rest-2", "rest-3", "rest-4"]);
    expect(v.restaurants.every((r) => r.verification?.status === "web-sourced")).toBe(true);
    expect(v.closedDays["rest-2"]).toEqual([6]);
  });

  it("drops places Google lists as closed and ignores far-away name matches", () => {
    const b = brief();
    const lookups = none(b);
    const now = new Date().toISOString();
    lookups.restaurants[0] = { verification: { status: "closed", provider: "google_places", checkedAt: now } } as VerifyResult;
    lookups.restaurants[2] = { distanceKm: 900, verification: { status: "verified", provider: "google_places", checkedAt: now, rating: 4.9 } } as VerifyResult;
    lookups.restaurants[1] = { distanceKm: 2, verification: { status: "verified", provider: "google_places", checkedAt: now, rating: 4.6, address: "7114 S Virginia Dare Trl" } } as VerifyResult;
    const v = buildVenues(b, lookups);
    expect(v.removed).toEqual([{ name: "Sam & Omie's", reason: "Google lists it as closed" }]);
    const owens = v.restaurants.find((r) => r.name === "Owens' Restaurant")!;
    expect(owens.verification?.status).toBe("verified");
    expect(owens.address).toBe("7114 S Virginia Dare Trl");
    expect(owens.rating).toBe("4.6");
    expect(v.restaurants.find((r) => r.name === "Mulligan's")!.verification?.status).toBe("web-sourced");
  });
});

describe("normalizePlan", () => {
  const w = wizard();
  const days = buildDays(w.startDate, w.nights);
  const venues = buildVenues(brief(), none());
  const result = normalizePlan(plan(), days, venues, w);

  it("never trusts model dates", () => {
    expect(result.itinerary.map((d) => d.date)).toEqual(days.map((d) => d.date));
    expect(result.itinerary[1].weekday).toBe("Saturday");
  });

  it("swaps a restaurant scheduled on its closed day", () => {
    const dinner = result.itinerary[1].meals.dinner;
    expect(dinner.restaurantId).not.toBe("rest-2");
    expect(dinner.note).toMatch(/Owens' Restaurant is closed on Saturdays/);
    expect(result.issues.some((i) => i.code === "venue_swapped")).toBe(true);
  });

  it("drops unknown venue references from alternatives", () => {
    expect(result.itinerary[0].meals.dinner.alternativeIds ?? []).not.toContain("rest-999");
  });

  it("creates recipe specs for cook-in meals the model forgot and drops unused ones", () => {
    const ids = result.recipeSpecs.map((s) => s.id).sort();
    expect(ids).toEqual(["rec-1", "rec-9"]);
    expect(result.recipeSpecs.find((s) => s.id === "rec-9")).toMatchObject({ name: "Grilled fish tacos", mealType: "dinner", day: 3 });
  });

  it("warns when an activity is scheduled on a day it's closed", () => {
    expect(result.itinerary[2].warnings?.[0]).toMatch(/Island Farm is usually closed on Sundays/);
  });

  it("reports missing days as repairable", () => {
    const short = { ...plan(), days: plan().days.slice(0, 2) };
    const r = normalizePlan(short, days, venues, w);
    expect(r.itinerary).toHaveLength(4);
    expect(r.repairable).toHaveLength(2);
  });
});

describe("normalizeRecipes + assembleTrip", () => {
  const w = wizard();
  const days = buildDays(w.startDate, w.nights);
  const venues = buildVenues(brief(), none());
  const normalized = normalizePlan(plan(), days, venues, w);
  const written: Recipe[] = [
    {
      id: "rec-1", name: "Pancakes", mealType: "breakfast", day: 1, servings: 2, prepTime: "10 min", cookTime: "15 min", difficulty: "easy", tip: "", tags: [],
      dietaryNotes: ["peanut allergy: safe as written"],
      ingredients: [{ item: "flour", amount: "1", unit: "cup", category: "pantry" }, { item: "peanut butter", amount: "2", unit: "tbsp", category: "pantry" }],
      steps: [{ step: 7, instruction: "Mix" }, { step: 9, instruction: "Cook" }],
    },
  ];
  const { recipes, issues, allergyConflicts } = normalizeRecipes(written, normalized.recipeSpecs, w);

  it("rescales to the group and renumbers steps", () => {
    expect(recipes[0].servings).toBe(4);
    expect(recipes[0].ingredients[0].amount).toBe("2");
    expect(recipes[0].steps.map((s) => s.step)).toEqual([1, 2]);
  });

  it("flags allergy conflicts for repair and reports missing recipes", () => {
    expect(allergyConflicts.map((c) => c.recipeId)).toEqual(["rec-1"]);
    expect(recipes[0].dietaryNotes?.some((n) => /not safe for the peanut allergy/.test(n))).toBe(true);
    expect(issues.some((i) => i.code === "recipe_missing")).toBe(true);
  });

  it("assembles a complete trip with grocery math and a quality report", () => {
    const trip = assembleTrip({
      wizard: w, days, brief: brief(), venues, sources: [], plan: plan(), normalized, recipes, recipeIssues: issues,
      models: ["claude-opus-5-5"], webSearches: 9, now: "2030-01-01T00:00:00.000Z",
    });
    expect(trip.schemaVersion).toBe(2);
    expect(trip.meta.dates).toEqual({ start: "2030-06-14", end: "2030-06-17", nights: 3 });
    // rec-9 was never written, so its meal no longer points at a missing recipe.
    expect(trip.itinerary[2].meals.dinner.recipeId).toBeUndefined();
    expect(trip.groceryList.master?.find((m) => m.item === "flour")?.quantity).toBe("2 cup");
    // 6 venues have a source URL; the grocery store doesn't, so it's "unverified".
    expect(trip.quality?.venues).toMatchObject({ total: 7, verified: 0, webSourced: 6, unverified: 1 });
    expect(trip.quality?.webSearches).toBe(9);
    expect(trip.sources?.length).toBeGreaterThan(0);
  });
});
