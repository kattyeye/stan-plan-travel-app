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
  | "family-fun";

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
}

export interface ItineraryDay {
  day: number;
  date: string;
  theme?: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
  };
  activities: string[];
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
  stripeSessionId?: string;
  createdAt: string;
  updatedAt: string;
}
