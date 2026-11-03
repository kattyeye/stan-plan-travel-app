// ============================================================
// WIZARD TYPES
// ============================================================

export type PlanningStyle = "structured" | "balanced" | "flexible";
export type BudgetTier = "budget" | "moderate" | "splurge";
export type TravelMethod = "car" | "plane" | "train" | "other";
export type CookInRatio = "mostly-in" | "mix" | "mostly-out";
export type MealType = "breakfast" | "lunch" | "dinner";

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

/**
 * Where the stay is. Filled in by the guest in the wizard, or supplied by a
 * booking partner (Airbnb, VRBO, …) through /api/v1 so the plan is built
 * around the real listing: its kitchen, amenities, check-in time and location.
 */
export interface PropertyContext {
  source: "manual" | "airbnb" | "vrbo" | "booking" | "partner";
  /** The partner's own listing id. */
  externalId?: string;
  name?: string;
  url?: string;
  address?: string;
  lat?: number;
  lng?: number;
  /** Local time, e.g. "16:00". */
  checkInTime?: string;
  checkOutTime?: string;
  maxGuests?: number;
  bedrooms?: number;
  kitchen?: "full" | "kitchenette" | "none";
  amenities: string[];
  houseRules?: string[];
  description?: string;
}

/** Attribution for trips that arrive through a partner integration. */
export interface PartnerRef {
  partnerId: string;
  /** The partner's booking or reservation reference. */
  externalRef?: string;
}

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
  sections: TripSection[];
  email: string;
  tripNickname: string;
  /** Structured listing data — present when a partner supplied it. */
  property?: PropertyContext;
  partner?: PartnerRef;
}

// ============================================================
// VERIFICATION — how we know a place is real and open
// ============================================================

export type VerificationStatus =
  /** Matched to a live Google Places listing that reports it operational. */
  | "verified"
  /** Found on the web during research but not confirmed by Google Places. */
  | "web-sourced"
  /** Google reports it closed (temporarily or permanently). Never shown in plans. */
  | "closed"
  /** No evidence either way. */
  | "unverified";

export interface Verification {
  status: VerificationStatus;
  provider: "google_places" | "web";
  checkedAt: string;
  placeId?: string;
  mapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  /** Canonical address from the provider. */
  address?: string;
  /** Human-readable weekly hours, e.g. "Monday: 8:00 AM – 2:00 PM". */
  hours?: string[];
  /** Days of the week (0 = Sunday) the venue has any opening hours. */
  openDays?: number[];
  website?: string;
}

export interface SourceLink {
  title: string;
  url: string;
}

// ============================================================
// GENERATED TRIP
// ============================================================

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
  /** Which dietary needs this recipe satisfies, and how (e.g. "vegan: skip the feta on one plate"). */
  dietaryNotes?: string[];
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
  /** Meals this place is a good fit for. */
  bestFor?: (MealType | "drinks" | "coffee" | "dessert")[];
  /** Where the research found it. */
  sourceUrl?: string;
  verification?: Verification;
}

export interface Meal {
  type: "cook-in" | "eat-out";
  name: string;
  recipeId?: string;
  /** Reference into GeneratedTrip.restaurants. */
  restaurantId?: string;
  /** Legacy (v1 trips embedded the restaurant). */
  restaurant?: Restaurant;
  /** "7:30pm" (structured) or "Evening" (balanced). */
  time?: string;
  note?: string;
  /** Flexible style: other good options for this slot (restaurant ids). */
  alternativeIds?: string[];
  /** Problems the final checks found, e.g. the venue is closed that day. */
  warnings?: string[];
}

export interface ItineraryDay {
  day: number;
  date: string;
  /** e.g. "Friday" — computed from the date, never by the model. */
  weekday?: string;
  theme?: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
  };
  activities: string[];
  vibe: string[];
  warnings?: string[];
}

export interface GroceryByMeal {
  mealName: string;
  day: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId: string;
  ingredients: RecipeIngredient[];
}

export interface GroceryStore {
  name: string;
  type: "bulk" | "specialty" | "seafood" | "local-market" | "general";
  note: string;
  address?: string;
  verification?: Verification;
}

/** One line of the combined shopping list. */
export interface AggregatedIngredient {
  item: string;
  /** e.g. "3 cups + 2 tbsp" when units can't be combined. */
  quantity: string;
  category: RecipeIngredient["category"];
  /** Recipe ids that use this ingredient. */
  usedIn: string[];
}

export interface GroceryList {
  byMeal: GroceryByMeal[];
  staples: RecipeIngredient[];
  shoppingNote: string;
  stores: GroceryStore[];
  /** Deduplicated master list computed from recipes + staples (v2 trips). */
  master?: AggregatedIngredient[];
}

export interface Activity {
  id?: string;
  name: string;
  description: string;
  duration?: string;
  cost?: string;
  bookingRequired: boolean;
  kidFriendly: boolean;
  tags: string[];
  link?: string;
  address?: string;
  sourceUrl?: string;
  verification?: Verification;
}

export interface DayTrip {
  destination: string;
  distanceMinutes: number;
  description: string;
  highlights: string[];
}

export interface LocalEvent {
  name: string;
  /** Free text such as "Jun 15–17" — events are only included when the dates overlap the trip. */
  dates: string;
  description: string;
  sourceUrl?: string;
}

export interface TipsSection {
  activities: Activity[];
  practical: string[];
  dayTrips: DayTrip[];
  events?: LocalEvent[];
  /** What the weather is typically like on these dates. */
  weather?: string;
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

export type QualityIssueSeverity = "info" | "warning" | "error";

export interface QualityIssue {
  severity: QualityIssueSeverity;
  code: string;
  message: string;
  day?: number;
}

/** What the final checks found. Shown (summarised) to the traveller and in full to admins. */
export interface QualityReport {
  checkedAt: string;
  venues: { total: number; verified: number; webSourced: number; unverified: number; removedClosed: number };
  issues: QualityIssue[];
  /** Model ids used, for audit. */
  models: string[];
  webSearches: number;
}

export interface GeneratedTrip {
  /** 2 = grounded pipeline (web research + verification). Absent on legacy trips. */
  schemaVersion?: 2;
  generatedAt?: string;
  meta: TripMeta;
  preferences: TripPreferences;
  recipes: Recipe[];
  itinerary: ItineraryDay[];
  restaurants: Restaurant[];
  groceryList: GroceryList;
  tips: TipsSection;
  packingList: PackingList;
  sources?: SourceLink[];
  quality?: QualityReport;
}

// ============================================================
// PERSISTENCE
// ============================================================

export type TripStatus = "pending" | "paid" | "generating" | "ready" | "error";

export type PipelineStage = "research" | "plan" | "recipes" | "finalize";

export interface TripProgress {
  stage: PipelineStage | "queued" | "done";
  /** Short, human copy for the waiting screen. */
  message: string;
  /** 0–100. */
  percent: number;
  updatedAt: string;
  startedAt?: string;
}

export interface TripRecord {
  id: number;
  slug: string;
  email: string;
  tripNickname: string;
  status: TripStatus;
  wizardData: WizardData;
  generatedData?: GeneratedTrip;
  stripeSessionId?: string;
  createdAt: string;
  updatedAt: string;
  progress?: TripProgress;
  /** Customer-safe error message when status is "error". */
  errorMessage?: string;
  /** How the trip was paid for. */
  billing?: "stripe" | "partner" | "free";
  partner?: PartnerRef;
  /** Legacy: LLM-rendered HTML from v1 trips. New trips render HTML on demand. */
  htmlBlob?: string;
}
