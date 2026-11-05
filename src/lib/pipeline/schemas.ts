import { z } from "zod";

/**
 * Contracts between the model and the app. Each stage's output is validated
 * against these before anything is stored. Optional values are modelled as
 * `nullable` because structured outputs require every key to be present.
 */

const priceRange = z.enum(["$", "$$", "$$$", "$$$$"]);
const ingredientCategory = z.enum(["produce", "meat", "seafood", "dairy", "pantry", "drinks", "supplies", "frozen", "bakery"]);
const mealSlot = z.enum(["breakfast", "lunch", "dinner"]);
const venueMeal = z.enum(["breakfast", "lunch", "dinner", "drinks", "coffee", "dessert"]);
const weekday = z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);

// ─── Stage 1: research ───────────────────────────────────────────────────────

export const ResearchRestaurant = z.object({
  name: z.string().describe("Exact business name as listed on its website or Google"),
  address: z.string().describe("Street address including town"),
  neighborhood: z.string().nullable(),
  cuisine: z.string(),
  priceRange,
  bestFor: z.array(venueMeal).describe("Meals it actually serves and is good for"),
  closedDays: z.array(weekday).describe("Days it is closed according to your sources; empty if open daily"),
  hoursSummary: z.string().describe('e.g. "Wed–Sun 5–10pm" — from a source, not memory'),
  kidFriendly: z.boolean(),
  dietaryOptions: z.array(z.string()).describe('e.g. "clearly marked vegan dishes", "dedicated gluten-free fryer"'),
  whyItFits: z.string().describe("One or two sentences tying it to this group"),
  sourceUrl: z.string().describe("A URL from your search results that confirms it is open"),
  website: z.string().nullable(),
});

export const ResearchActivity = z.object({
  name: z.string(),
  address: z.string().nullable(),
  description: z.string(),
  duration: z.string().nullable(),
  cost: z.string().nullable().describe("Current price with currency, or null if unknown"),
  bookingRequired: z.boolean(),
  kidFriendly: z.boolean(),
  closedDays: z.array(weekday),
  bestTime: z.string().nullable().describe('e.g. "Go before 10am to beat the heat"'),
  tags: z.array(z.string()),
  sourceUrl: z.string(),
  website: z.string().nullable(),
});

export const ResearchBriefSchema = z.object({
  areaSummary: z.string().describe("Two or three sentences on the area around the stay"),
  weather: z.string().describe("Typical conditions for these exact dates, with a source-backed range"),
  restaurants: z.array(ResearchRestaurant),
  activities: z.array(ResearchActivity),
  groceryStores: z.array(
    z.object({
      name: z.string(),
      address: z.string().nullable(),
      type: z.enum(["bulk", "specialty", "seafood", "local-market", "general"]),
      note: z.string(),
      sourceUrl: z.string().nullable(),
    })
  ),
  events: z
    .array(
      z.object({
        name: z.string(),
        dates: z.string().describe("Dates as published; must overlap the trip"),
        description: z.string(),
        sourceUrl: z.string(),
      })
    )
    .describe("Only events confirmed to happen during the trip; empty if none confirmed"),
  dayTrips: z.array(
    z.object({
      destination: z.string(),
      distanceMinutes: z.number().describe("Driving time in minutes from the stay"),
      description: z.string(),
      highlights: z.array(z.string()),
    })
  ),
  practicalTips: z.array(z.string()).describe("Parking, permits, tides, reservations, local rules — specific to this place and season"),
});
export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;

// ─── Stage 2: plan ───────────────────────────────────────────────────────────

const PlannedMeal = z.object({
  type: z.enum(["cook-in", "eat-out"]),
  name: z.string().describe('Dish or venue-led name, e.g. "Shrimp tacos at the house" or "Brunch at Café X"'),
  restaurantId: z.string().nullable().describe("Required for eat-out meals at a researched venue; null otherwise"),
  recipeId: z.string().nullable().describe("Required for cook-in meals; must match an id in recipes[]"),
  time: z.string().nullable().describe('Structured: "8:00am". Balanced: "Morning". Flexible: null'),
  note: z.string().nullable(),
  alternativeIds: z.array(z.string()).describe("Other researched restaurant ids that work for this slot"),
});

export const PlanDraftSchema = z.object({
  title: z.string().describe("Warm, specific trip title"),
  days: z.array(
    z.object({
      day: z.number(),
      theme: z.string(),
      schedule: z.array(z.string()).describe("Ordered plan for the day, phrased per planning style"),
      meals: z.object({ breakfast: PlannedMeal, lunch: PlannedMeal, dinner: PlannedMeal }),
      vibe: z.array(z.string()),
    })
  ),
  recipes: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mealType: mealSlot,
        day: z.number(),
        brief: z.string().describe("What the dish is and why it suits this day"),
        dietaryApproach: z.string().describe("How it works for the group's dietary needs, or 'none needed'"),
      })
    )
    .describe("One entry per cook-in meal"),
  practicalTips: z.array(z.string()),
  staples: z.array(
    z.object({ item: z.string(), amount: z.string(), unit: z.string(), category: ingredientCategory })
  ).describe("Breakfast basics, snacks, drinks and pantry items not covered by recipes"),
  shoppingNote: z.string(),
});
export type PlanDraft = z.infer<typeof PlanDraftSchema>;

// ─── Stage 3: recipes ────────────────────────────────────────────────────────

export const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  day: z.number(),
  servings: z.number(),
  prepTime: z.string(),
  cookTime: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tip: z.string(),
  ingredients: z.array(
    z.object({
      item: z.string(),
      amount: z.string().describe('Numeric where possible: "2", "1/2", "1.5"'),
      unit: z.string(),
      category: ingredientCategory,
    })
  ),
  steps: z.array(z.object({ step: z.number(), instruction: z.string() })),
  tags: z.array(z.string()),
  dietaryNotes: z.array(z.string()).describe('e.g. "gluten-free as written", "vegan: hold the cheese on one plate"'),
});

export const RecipesResultSchema = z.object({ recipes: z.array(RecipeSchema) });

// ─── Packing ─────────────────────────────────────────────────────────────────

const packingItems = z.array(z.object({ item: z.string(), propertyProvides: z.boolean() }));

export const PackingResultSchema = z.object({
  clothingAdults: packingItems,
  clothingKids: packingItems,
  beachOutdoor: packingItems,
  kitchen: packingItems,
  toiletries: packingItems,
  electronics: packingItems,
  evening: packingItems,
  groupLogistics: packingItems,
  propertyProvides: packingItems,
});
export type PackingResult = z.infer<typeof PackingResultSchema>;

// ─── Wizard suggestions ──────────────────────────────────────────────────────

export const SuggestSchema = z.object({
  tripTypes: z.array(z.string()),
  vibes: z.array(z.string()),
  cuisines: z.array(z.string()),
  amenities: z.array(z.string()),
});

// ─── Trip page command bar ───────────────────────────────────────────────────

/** A traveller's question, interpreted as a filter over their plan — never a written answer. */
export const PlanFilterSchema = z.object({
  days: z.array(z.number().int()).describe("Trip day numbers the question is about; empty if none"),
  slots: z.array(z.enum(["breakfast", "lunch", "dinner"])),
  kinds: z.array(z.enum(["stop", "restaurant", "activity", "recipe", "event", "grocery", "packing"])).describe("What sort of results; empty for any"),
  tags: z.array(z.string()).describe("Only tags from the provided vocabulary"),
  kidFriendly: z.boolean().nullable(),
  bookingRequired: z.boolean().nullable(),
  verifiedOnly: z.boolean().nullable(),
  dietary: z.array(z.enum(["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free", "halal", "kosher", "pescatarian"])),
  text: z.array(z.string()).describe("At most 4 short keywords likely to appear in place names or descriptions"),
});
export type PlanFilterDraft = z.infer<typeof PlanFilterSchema>;
