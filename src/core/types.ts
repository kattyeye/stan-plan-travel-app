// ============================================================
// WIZARD TYPES
// ============================================================

export type PlanningStyle = "structured" | "balanced" | "flexible";
export type BudgetTier = "budget" | "moderate" | "splurge";
export type TravelMethod = "car" | "plane" | "train" | "other";
export type CookInRatio = "mostly-in" | "mix" | "mostly-out";

export type TripVibe =
  | "laid-back"
  | "adventurous"
  | "foodie"
  | "nature"
  | "cultural"
  | "family-fun"
  | "nightlife"
  | "live-music";

export type TripSection =
  | "itinerary"
  | "meals"
  | "grocery"
  | "restaurants"
  | "activities"
  | "packing";

export interface WizardData {
  destination: string;
  startDate: string;
  endDate: string;
  nights: number;
  tripType: string;
  numAdults: number;
  numKids: number;
  kidAges: number[];
  planningStyle: PlanningStyle;
  budget: BudgetTier;
  vibes: TripVibe[];
  travelMethod: TravelMethod;
  cookInRatio: CookInRatio;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  propertyDescription: string;
  propertyAmenities: string[];
  /** Minimum bedrooms, used to prefill lodging searches. */
  bedrooms?: number;
  sections: TripSection[];
  email: string;
  tripNickname: string;
}

export interface RecipeIngredient {
  item: string;
  amount: string;
  unit: string;
  category: "produce" | "meat" | "seafood" | "dairy" | "pantry" | "drinks" | "supplies" | "frozen" | "bakery";
  storeNote?: string;
}

export interface RecipeStep {
  step: number;
  instruction: string;
}

export interface Recipe {
  id: string;
  name: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  day: number;
  servings: number;
  prepTime: string;
  cookTime: string;
  difficulty: "easy" | "medium" | "hard";
  tip: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  hours: string;
  tags: string[];
  description: string;
  priceRange: "$" | "$$" | "$$$" | "$$$$";
  rating?: string;
  link?: string;
}

export interface Meal {
  type: "cook-in" | "eat-out";
  name: string;
  recipeId?: string;
  restaurant?: Restaurant;
  /** "HH:MM" 24-hour, local to the destination. Absent on flexible-style trips. */
  time?: string;
}

/**
 * A single scheduled thing. Replaces the old plain-string activity so that
 * times are machine-readable and the plan can be exported to a calendar.
 */
export interface ItineraryActivity {
  title: string;
  /** "HH:MM" 24-hour, local to the destination. Absent = untimed suggestion. */
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  bookingRequired?: boolean;
}

/**
 * What may appear in stored data. Trips generated before structured times
 * exist hold plain strings like "9:00am — Kayak rental at Kitty Hawk".
 * Never render this directly — run it through `normalizeTrip()` first.
 */
export type RawActivity = string | ItineraryActivity;

export interface ItineraryDay {
  day: number;
  date: string;
  theme?: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
  };
  activities: RawActivity[];
  vibe: string[];
}

export interface GroceryByMeal {
  mealName: string;
  day: number;
  mealType: "breakfast" | "lunch" | "dinner";
  recipeId: string;
  ingredients: RecipeIngredient[];
}

export interface GroceryStore {
  name: string;
  type: "bulk" | "specialty" | "seafood" | "local-market" | "general";
  note: string;
}

export interface GroceryList {
  byMeal: GroceryByMeal[];
  staples: RecipeIngredient[];
  shoppingNote: string;
  stores: GroceryStore[];
}

export interface Activity {
  name: string;
  description: string;
  duration?: string;
  cost?: string;
  bookingRequired: boolean;
  kidFriendly: boolean;
  tags: string[];
  link?: string;
}

export interface DayTrip {
  destination: string;
  distanceMinutes: number;
  description: string;
  highlights: string[];
}

export interface TipsSection {
  activities: Activity[];
  practical: string[];
  dayTrips: DayTrip[];
}

export interface PackingItem {
  item: string;
  checked: boolean;
  propertyProvides?: boolean;
}

export interface PackingList {
  clothingAdults: PackingItem[];
  clothingKids: PackingItem[];
  beachOutdoor: PackingItem[];
  kitchen: PackingItem[];
  toiletries: PackingItem[];
  electronics: PackingItem[];
  evening: PackingItem[];
  groupLogistics: PackingItem[];
  propertyProvides: PackingItem[];
}

export interface TripMeta {
  title: string;
  destination: string;
  dates: { start: string; end: string; nights: number };
  group: { adults: number; kids: number; kidAges: number[]; totalPeople: number };
  property: string;
  tripType: string;
}

export interface TripPreferences {
  planningStyle: PlanningStyle;
  budget: BudgetTier;
  vibes: TripVibe[];
  cookInRatio: CookInRatio;
  dietaryRestrictions: string[];
}

export interface GeneratedTrip {
  meta: TripMeta;
  preferences: TripPreferences;
  recipes: Recipe[];
  itinerary: ItineraryDay[];
  restaurants: Restaurant[];
  groceryList: GroceryList;
  tips: TipsSection;
  packingList: PackingList;
}

export type TripStatus = "pending" | "paid" | "generating" | "ready" | "error";

export interface TripRecord {
  id: number;
  slug: string;
  email: string;
  tripNickname: string;
  status: TripStatus;
  wizardData: WizardData;
  generatedData?: GeneratedTrip;
  /** Self-contained HTML rendering, produced by the second Claude call. */
  htmlBlob?: string;
  stripeSessionId?: string;
  /** Creator/influencer referral code captured from `?ref=` at trip creation. */
  referralCode?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// NORMALIZED VIEW
//
// `normalizeTrip()` (src/core/normalize.ts) upgrades a stored GeneratedTrip
// into these shapes: activities are always objects, meals always have a time.
// Every renderer and the calendar builder consume these, never the raw types.
// ============================================================

export type NormalizedMeal = Meal & { time: string };

export interface NormalizedItineraryDay extends Omit<ItineraryDay, "activities" | "meals"> {
  /**
   * Machine-usable YYYY-MM-DD, derived by the normalizer. `date` is kept as-is
   * for display (generators sometimes emit "Jun 14"); anything that needs a
   * real calendar date must use this and tolerate it being absent.
   */
  isoDate?: string;
  activities: ItineraryActivity[];
  meals: {
    breakfast: NormalizedMeal;
    lunch: NormalizedMeal;
    dinner: NormalizedMeal;
  };
}

export interface NormalizedTrip extends Omit<GeneratedTrip, "itinerary"> {
  itinerary: NormalizedItineraryDay[];
}
