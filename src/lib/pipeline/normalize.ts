import type {
  Activity,
  GeneratedTrip,
  GroceryStore,
  ItineraryDay,
  Meal,
  MealType,
  PackingList,
  QualityIssue,
  QualityReport,
  Recipe,
  Restaurant,
  SourceLink,
  Verification,
  WizardData,
} from "@/types/trip";
import { isOpenAt, parseClock, type OpeningPeriod, type VerifyResult } from "../places";
import { aggregateIngredients, scaleRecipe } from "../utils";
import type { DaySkeleton } from "./days";
import { WEEKDAYS } from "./days";
import { findDietaryConflicts } from "./dietary";
import type { PackingResult, PlanDraft, ResearchBrief } from "./schemas";

/**
 * Everything in this file is deterministic and side-effect free, so it can be
 * unit-tested without calling a model. It's where the plan stops being "what
 * the model said" and becomes something we're willing to put our name on.
 */

// ─── Research → venues ───────────────────────────────────────────────────────

export interface Venues {
  restaurants: Restaurant[];
  activities: Activity[];
  stores: GroceryStore[];
  /** Google opening periods by venue id. */
  periods: Record<string, OpeningPeriod[]>;
  /** Research-reported closed weekdays (0 = Sunday) by venue id. */
  closedDays: Record<string, number[]>;
  removed: { name: string; reason: string }[];
}

const dayIndex = (names: string[]) =>
  names.map((n) => WEEKDAYS.indexOf(n as (typeof WEEKDAYS)[number])).filter((i) => i >= 0);

const isHttpUrl = (s: string | null | undefined): s is string => !!s && /^https?:\/\/\S+$/i.test(s.trim());

/**
 * Combines research with verification results. `lookups` holds one entry per
 * venue in brief order (restaurants, then activities, then stores); null means
 * no provider check was possible.
 */
export function buildVenues(
  brief: ResearchBrief,
  lookups: { restaurants: (VerifyResult | null)[]; activities: (VerifyResult | null)[]; stores: (VerifyResult | null)[] },
  now = new Date().toISOString()
): Venues {
  const out: Venues = { restaurants: [], activities: [], stores: [], periods: {}, closedDays: {}, removed: [] };

  const resolve = (name: string, sourceUrl: string | null, lookup: VerifyResult | null | undefined): Verification | "drop" => {
    const v = lookup?.verification;
    if (v?.status === "closed") {
      out.removed.push({ name, reason: "Google lists it as closed" });
      return "drop";
    }
    // A Google match far from the destination is almost certainly a different
    // business with the same name — don't borrow its data.
    if (v?.status === "verified" && (lookup?.distanceKm ?? 0) <= 80) return v;
    return { status: isHttpUrl(sourceUrl) ? "web-sourced" : "unverified", provider: "web", checkedAt: v?.checkedAt ?? now };
  };

  const seen = new Set<string>();
  const dedupe = (name: string) => {
    const k = name.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  };

  brief.restaurants.forEach((r, i) => {
    if (!dedupe(r.name)) return;
    const lookup = lookups.restaurants[i];
    const verification = resolve(r.name, r.sourceUrl, lookup);
    if (verification === "drop") return;
    const id = `rest-${out.restaurants.length + 1}`;
    const verified = verification.status === "verified";
    out.restaurants.push({
      id,
      name: r.name,
      address: (verified && verification.address) || r.address,
      hours: r.hoursSummary,
      tags: [r.cuisine, ...(r.neighborhood ? [r.neighborhood] : []), ...(r.kidFriendly ? ["kid-friendly"] : []), ...r.dietaryOptions].filter(Boolean),
      description: r.whyItFits,
      priceRange: r.priceRange,
      rating: verified && verification.rating ? verification.rating.toFixed(1) : undefined,
      link: (verified && verification.website) || (isHttpUrl(r.website) ? r.website : undefined),
      bestFor: r.bestFor,
      sourceUrl: isHttpUrl(r.sourceUrl) ? r.sourceUrl : undefined,
      verification,
    });
    if (verified && lookup?.periods?.length) out.periods[id] = lookup.periods;
    out.closedDays[id] = dayIndex(r.closedDays);
  });

  brief.activities.forEach((a, i) => {
    if (!dedupe(a.name)) return;
    const lookup = lookups.activities[i];
    const verification = resolve(a.name, a.sourceUrl, lookup);
    if (verification === "drop") return;
    const id = `act-${out.activities.length + 1}`;
    const verified = verification.status === "verified";
    out.activities.push({
      id,
      name: a.name,
      description: a.bestTime ? `${a.description} ${a.bestTime}` : a.description,
      duration: a.duration ?? undefined,
      cost: a.cost ?? undefined,
      bookingRequired: a.bookingRequired,
      kidFriendly: a.kidFriendly,
      tags: a.tags,
      link: (verified && verification.website) || (isHttpUrl(a.website) ? a.website : undefined),
      address: (verified && verification.address) || a.address || undefined,
      sourceUrl: isHttpUrl(a.sourceUrl) ? a.sourceUrl : undefined,
      verification,
    });
    if (verified && lookup?.periods?.length) out.periods[id] = lookup.periods;
    out.closedDays[id] = dayIndex(a.closedDays);
  });

  brief.groceryStores.forEach((s, i) => {
    if (!dedupe(s.name)) return;
    const verification = resolve(s.name, s.sourceUrl, lookups.stores[i]);
    if (verification === "drop") return;
    out.stores.push({
      name: s.name,
      type: s.type,
      note: s.note,
      address: (verification.status === "verified" && verification.address) || s.address || undefined,
      verification,
    });
  });

  return out;
}

/** Compact view of the shortlist for the planning prompt. */
export function researchForPrompt(brief: ResearchBrief, venues: Venues): string {
  return JSON.stringify(
    {
      areaSummary: brief.areaSummary,
      weather: brief.weather,
      restaurants: venues.restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        bestFor: r.bestFor,
        price: r.priceRange,
        hours: r.verification?.hours?.length ? r.verification.hours : r.hours,
        closedDays: (venues.closedDays[r.id] ?? []).map((d) => WEEKDAYS[d]),
        tags: r.tags,
        notes: r.description,
        address: r.address,
      })),
      activities: venues.activities.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        duration: a.duration,
        cost: a.cost,
        bookingRequired: a.bookingRequired,
        kidFriendly: a.kidFriendly,
        hours: a.verification?.hours,
        closedDays: (venues.closedDays[a.id!] ?? []).map((d) => WEEKDAYS[d]),
        address: a.address,
      })),
      groceryStores: venues.stores.map((s) => ({ name: s.name, type: s.type, note: s.note })),
      events: brief.events,
      dayTrips: brief.dayTrips,
      practicalTips: brief.practicalTips,
    },
    null,
    1
  );
}

// ─── Opening-hours logic ─────────────────────────────────────────────────────

const DEFAULT_MEAL_TIME: Record<MealType, { hour: number; minute: number }> = {
  breakfast: { hour: 9, minute: 0 },
  lunch: { hour: 12, minute: 30 },
  dinner: { hour: 19, minute: 0 },
};

/** Open at that meal on that day? undefined = unknown. */
export function venueOpenFor(
  venueId: string,
  venues: Pick<Venues, "periods" | "closedDays">,
  weekdayIndex: number,
  slot: MealType,
  time?: string | null
): boolean | undefined {
  const clock = parseClock(time) ?? DEFAULT_MEAL_TIME[slot];
  const byHours = isOpenAt(venues.periods[venueId], weekdayIndex, clock.hour, clock.minute);
  if (byHours !== undefined) return byHours;
  if (venues.closedDays[venueId]?.includes(weekdayIndex)) return false;
  return undefined;
}

const servesSlot = (r: Restaurant, slot: MealType) =>
  !r.bestFor?.length || r.bestFor.includes(slot) || (slot === "breakfast" && r.bestFor.includes("coffee"));

// ─── Plan → itinerary ────────────────────────────────────────────────────────

export interface NormalizedPlan {
  itinerary: ItineraryDay[];
  recipeSpecs: PlanDraft["recipes"];
  issues: QualityIssue[];
  /** Structural problems worth one LLM repair attempt. */
  repairable: string[];
}

export function normalizePlan(plan: PlanDraft, days: DaySkeleton[], venues: Venues, w: WizardData): NormalizedPlan {
  const issues: QualityIssue[] = [];
  const repairable: string[] = [];
  const restaurantsById = new Map(venues.restaurants.map((r) => [r.id, r]));
  const specs = new Map<string, PlanDraft["recipes"][number]>();
  for (const s of plan.recipes) if (!specs.has(s.id)) specs.set(s.id, s);
  const usedSpecIds = new Set<string>();
  let nextRec = plan.recipes.length + 1;

  const planDays = new Map<number, PlanDraft["days"][number]>();
  plan.days.forEach((d, i) => {
    const n = Number.isFinite(d.day) && d.day >= 1 ? d.day : i + 1;
    if (!planDays.has(n)) planDays.set(n, d);
  });

  const itinerary: ItineraryDay[] = days.map((sk) => {
    const pd = planDays.get(sk.day);
    if (!pd) {
      repairable.push(`Day ${sk.day} (${sk.weekday} ${sk.date}) is missing.`);
      issues.push({ severity: "warning", code: "day_missing", message: `Day ${sk.day} wasn't planned in detail.`, day: sk.day });
    }
    const usedToday = new Set<string>();
    const dayWarnings: string[] = [];

    const fixMeal = (slot: MealType): Meal => {
      const pm = pd?.meals[slot];
      if (!pm) {
        return { type: "eat-out", name: "Your pick — see the restaurant guide", note: "Open slot" };
      }
      const meal: Meal = {
        type: pm.type,
        name: pm.name,
        time: pm.time ?? undefined,
        note: pm.note ?? undefined,
      };

      if (pm.type === "cook-in") {
        let id = pm.recipeId ?? "";
        if (!id || !specs.has(id)) {
          id = id && !specs.has(id) ? id : `rec-${nextRec++}`;
          specs.set(id, { id, name: pm.name, mealType: slot, day: sk.day, brief: pm.note ?? pm.name, dietaryApproach: "" });
        }
        const spec = specs.get(id)!;
        if (!usedSpecIds.has(id)) specs.set(id, { ...spec, mealType: slot, day: sk.day });
        usedSpecIds.add(id);
        meal.recipeId = id;
        return meal;
      }

      // Eat-out
      const candidates = [pm.restaurantId, ...pm.alternativeIds].filter((id): id is string => !!id && restaurantsById.has(id));
      if (pm.restaurantId && !restaurantsById.has(pm.restaurantId)) {
        issues.push({ severity: "info", code: "unknown_venue", message: `Dropped an unknown venue reference on day ${sk.day} ${slot}.`, day: sk.day });
      }
      const openAlts = (exclude: string) =>
        candidates.filter((id) => id !== exclude && venueOpenFor(id, venues, sk.weekdayIndex, slot, pm.time) !== false);

      let primary = candidates[0];
      if (primary && venueOpenFor(primary, venues, sk.weekdayIndex, slot, pm.time) === false) {
        const original = restaurantsById.get(primary)!;
        // Prefer the model's own alternatives, then places known to be open,
        // then places not known to be closed — verified venues first.
        const pool = venues.restaurants
          .filter((r) => r.id !== primary && !usedToday.has(r.id) && servesSlot(r, slot))
          .sort((a, b) => Number(b.verification?.status === "verified") - Number(a.verification?.status === "verified"));
        const replacement =
          openAlts(primary)[0] ??
          pool.find((r) => venueOpenFor(r.id, venues, sk.weekdayIndex, slot, pm.time) === true)?.id ??
          pool.find((r) => venueOpenFor(r.id, venues, sk.weekdayIndex, slot, pm.time) === undefined)?.id;
        const why = venues.periods[primary] ? `isn't open then on ${sk.weekday}s (per Google)` : `is closed on ${sk.weekday}s`;
        if (replacement) {
          const r = restaurantsById.get(replacement)!;
          issues.push({ severity: "info", code: "venue_swapped", message: `Day ${sk.day} ${slot}: ${original.name} ${why}; swapped in ${r.name}.`, day: sk.day });
          meal.name = pm.name.includes(original.name) ? pm.name.replace(original.name, r.name) : r.name;
          // The model's note described the original venue, so replace it rather than append.
          meal.note = `${original.name} ${why}, so we picked ${r.name} instead.`;
          primary = replacement;
        } else {
          meal.warnings = [`${original.name} ${why}. Call ahead or pick another spot from the restaurant guide.`];
          issues.push({ severity: "warning", code: "venue_closed", message: `Day ${sk.day} ${slot}: ${original.name} ${why} and no open alternative was found.`, day: sk.day });
        }
      }

      if (primary) {
        meal.restaurantId = primary;
        usedToday.add(primary);
        const alts = openAlts(primary);
        if (alts.length) meal.alternativeIds = alts;
      } else if (pm.restaurantId) {
        meal.warnings = ["We couldn't confirm a specific spot for this meal — see the restaurant guide."];
      }
      return meal;
    };

    const meals = { breakfast: fixMeal("breakfast"), lunch: fixMeal("lunch"), dinner: fixMeal("dinner") };

    // Activities named in the schedule on a day they're closed.
    const schedule = pd?.schedule ?? ["Free day — pick something from the activities list."];
    for (const a of venues.activities) {
      if (!a.id || !schedule.some((line) => line.toLowerCase().includes(a.name.toLowerCase()))) continue;
      const hours = venues.periods[a.id];
      const closed = hours ? !hours.some((p) => p.open.day === sk.weekdayIndex) : venues.closedDays[a.id]?.includes(sk.weekdayIndex);
      if (closed) {
        dayWarnings.push(`${a.name} is usually closed on ${sk.weekday}s — check before you go.`);
        issues.push({ severity: "warning", code: "activity_closed", message: `Day ${sk.day}: ${a.name} is closed on ${sk.weekday}s.`, day: sk.day });
      }
    }

    return {
      day: sk.day,
      date: sk.date,
      weekday: sk.weekday,
      theme: pd?.theme,
      meals,
      activities: schedule,
      vibe: pd?.vibe ?? [],
      ...(dayWarnings.length ? { warnings: dayWarnings } : {}),
    };
  });

  if (plan.days.length > days.length) {
    issues.push({ severity: "info", code: "extra_days", message: `The draft had ${plan.days.length - days.length} extra day(s); they were dropped.` });
  }

  // Cook/eat balance vs what the group asked for.
  const allMeals = itinerary.flatMap((d) => [d.meals.breakfast, d.meals.lunch, d.meals.dinner]);
  const cookShare = allMeals.filter((m) => m.type === "cook-in").length / Math.max(1, allMeals.length);
  if (w.cookInRatio === "mostly-in" && cookShare < 0.4)
    issues.push({ severity: "warning", code: "cook_ratio", message: `Only ${Math.round(cookShare * 100)}% of meals are cooked in, but the group wanted mostly cooking.` });
  if (w.cookInRatio === "mostly-out" && cookShare > 0.5)
    issues.push({ severity: "warning", code: "cook_ratio", message: `${Math.round(cookShare * 100)}% of meals are cooked in, but the group wanted mostly eating out.` });

  // Planning-style signal (admin only).
  if (w.planningStyle === "structured") {
    const lines = itinerary.flatMap((d) => d.activities);
    const timed = lines.filter((l) => /^\s*\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?\s*[—–-]/i.test(l)).length;
    if (lines.length && timed / lines.length < 0.6)
      issues.push({ severity: "info", code: "style", message: "Structured trip, but many schedule lines have no time." });
  }

  const recipeSpecs = [...specs.values()].filter((s) => usedSpecIds.has(s.id));
  return { itinerary, recipeSpecs, issues, repairable };
}

// ─── Recipes ─────────────────────────────────────────────────────────────────

export function normalizeRecipes(
  recipes: Recipe[],
  specs: PlanDraft["recipes"],
  w: WizardData
): { recipes: Recipe[]; issues: QualityIssue[]; allergyConflicts: { recipeId: string; text: string }[] } {
  const total = w.numAdults + w.numKids;
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const issues: QualityIssue[] = [];
  const out: Recipe[] = [];

  for (const spec of specs) {
    const r = byId.get(spec.id) ?? recipes.find((x) => x.name.toLowerCase() === spec.name.toLowerCase());
    if (!r) {
      issues.push({ severity: "warning", code: "recipe_missing", message: `No recipe was written for "${spec.name}".`, day: spec.day });
      continue;
    }
    const scaled = scaleRecipe({ ...r, id: spec.id, day: spec.day, mealType: spec.mealType }, total);
    if (r.servings !== total) {
      issues.push({ severity: "info", code: "rescaled", message: `Rescaled "${r.name}" from ${r.servings} to ${total} servings.` });
    }
    out.push({ ...scaled, steps: scaled.steps.map((s, i) => ({ step: i + 1, instruction: s.instruction })) });
  }

  const allergyConflicts: { recipeId: string; text: string }[] = [];
  for (const c of findDietaryConflicts(out, w.dietaryRestrictions)) {
    if (c.addressed) continue;
    const recipe = out.find((r) => r.id === c.recipeId)!;
    const warning =
      c.severity === "allergy"
        ? `Contains ${c.ingredients.join(", ")} — not safe for the ${c.restriction} in your group as written.`
        : `Contains ${c.ingredients.join(", ")} — adjust a portion for the ${c.restriction} in your group.`;
    recipe.dietaryNotes = [...(recipe.dietaryNotes ?? []), warning];
    if (c.severity === "allergy") {
      allergyConflicts.push({
        recipeId: c.recipeId,
        text: `"${c.recipeName}" (${c.recipeId}) uses ${c.ingredients.join(", ")}, which conflicts with: ${c.restriction}.`,
      });
      issues.push({ severity: "error", code: "dietary_allergy", message: `"${c.recipeName}" conflicts with ${c.restriction}: ${c.ingredients.join(", ")}.` });
    } else {
      issues.push({ severity: "warning", code: "dietary_preference", message: `"${c.recipeName}" has ${c.ingredients.join(", ")} without a note for ${c.restriction}.` });
    }
  }

  return { recipes: out, issues, allergyConflicts };
}

// ─── Packing ─────────────────────────────────────────────────────────────────

export function toPackingList(p: PackingResult | undefined): PackingList {
  const map = (items: PackingResult["clothingAdults"] | undefined) =>
    (items ?? []).map((i) => ({ item: i.item, checked: false, ...(i.propertyProvides ? { propertyProvides: true } : {}) }));
  return {
    clothingAdults: map(p?.clothingAdults),
    clothingKids: map(p?.clothingKids),
    beachOutdoor: map(p?.beachOutdoor),
    kitchen: map(p?.kitchen),
    toiletries: map(p?.toiletries),
    electronics: map(p?.electronics),
    evening: map(p?.evening),
    groupLogistics: map(p?.groupLogistics),
    propertyProvides: (p?.propertyProvides ?? []).map((i) => ({ item: i.item, checked: true, propertyProvides: true })),
  };
}

// ─── Assembly ────────────────────────────────────────────────────────────────

export function assembleTrip(input: {
  wizard: WizardData;
  days: DaySkeleton[];
  brief: ResearchBrief;
  venues: Venues;
  sources: SourceLink[];
  plan: PlanDraft;
  normalized: NormalizedPlan;
  recipes: Recipe[];
  recipeIssues: QualityIssue[];
  packing?: PackingResult;
  models: string[];
  webSearches: number;
  now?: string;
}): GeneratedTrip {
  const { wizard: w, days, brief, venues, plan, normalized, recipes } = input;
  const now = input.now ?? new Date().toISOString();
  const recipeIds = new Set(recipes.map((r) => r.id));

  // Meals pointing at recipes that never got written become plain cook-in notes.
  const itinerary = normalized.itinerary.map((d) => {
    const fix = (m: Meal): Meal => (m.recipeId && !recipeIds.has(m.recipeId) ? { ...m, recipeId: undefined } : m);
    return { ...d, meals: { breakfast: fix(d.meals.breakfast), lunch: fix(d.meals.lunch), dinner: fix(d.meals.dinner) } };
  });

  const order = new Map<string, number>();
  itinerary.forEach((d, i) =>
    (["breakfast", "lunch", "dinner"] as const).forEach((slot, j) => {
      const id = d.meals[slot].recipeId;
      if (id && !order.has(id)) order.set(id, i * 3 + j);
    })
  );
  const orderedRecipes = [...recipes].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));

  const byMeal = orderedRecipes.map((r) => ({
    mealName: r.name,
    day: r.day,
    mealType: r.mealType,
    recipeId: r.id,
    ingredients: r.ingredients,
  }));

  const usedSourceUrls = [
    ...venues.restaurants.map((r) => r.sourceUrl),
    ...venues.activities.map((a) => a.sourceUrl),
    ...brief.events.map((e) => e.sourceUrl),
  ].filter(isHttpUrl);
  const sourceTitles = new Map(input.sources.map((s) => [s.url, s.title]));
  const sources = [...new Set(usedSourceUrls)].slice(0, 40).map((url) => ({ url, title: sourceTitles.get(url) ?? new URL(url).hostname }));

  const allVenues = [...venues.restaurants, ...venues.activities, ...venues.stores];
  const quality: QualityReport = {
    checkedAt: now,
    venues: {
      total: allVenues.length,
      verified: allVenues.filter((v) => v.verification?.status === "verified").length,
      webSourced: allVenues.filter((v) => v.verification?.status === "web-sourced").length,
      unverified: allVenues.filter((v) => v.verification?.status === "unverified").length,
      removedClosed: venues.removed.length,
    },
    issues: [...normalized.issues, ...input.recipeIssues],
    models: [...new Set(input.models)],
    webSearches: input.webSearches,
  };

  const last = days[days.length - 1];
  // A label, not the guest's free text (which can be long or anything at all).
  const tripType = w.tripType && w.tripType !== "other" ? w.tripType.charAt(0).toUpperCase() + w.tripType.slice(1) : "Vacation rental";
  const propertyLabel = w.property?.name ?? tripType;

  return {
    schemaVersion: 2,
    generatedAt: now,
    meta: {
      title: plan.title,
      destination: w.destination,
      dates: { start: days[0].date, end: last.date, nights: w.nights },
      group: { adults: w.numAdults, kids: w.numKids, kidAges: w.kidAges, totalPeople: w.numAdults + w.numKids },
      property: propertyLabel,
      tripType: w.tripType,
    },
    preferences: {
      planningStyle: w.planningStyle,
      budget: w.budget,
      vibes: w.vibes,
      cookInRatio: w.cookInRatio,
      dietaryRestrictions: w.dietaryRestrictions,
    },
    recipes: orderedRecipes,
    itinerary,
    restaurants: venues.restaurants,
    groceryList: {
      byMeal,
      staples: plan.staples,
      shoppingNote: plan.shoppingNote,
      stores: venues.stores,
      master: aggregateIngredients([...byMeal.map((m) => ({ recipeId: m.recipeId, ingredients: m.ingredients })), { ingredients: plan.staples }]),
    },
    tips: {
      activities: venues.activities,
      practical: plan.practicalTips.length ? plan.practicalTips : brief.practicalTips,
      dayTrips: brief.dayTrips,
      events: brief.events.filter((e) => isHttpUrl(e.sourceUrl)),
      weather: brief.weather,
    },
    packingList: toPackingList(input.packing),
    sources,
    quality,
  };
}
