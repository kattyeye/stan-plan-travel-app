import type { BudgetTier, CookInRatio, PlanningStyle, TravelMethod, TripSection, TripVibe } from "@/types/trip";

/**
 * Every choice the trip wizard offers, in one place. The web wizard renders
 * from these, and GET /api/v1/client/config serves them to mobile apps and
 * extensions so they never hard-code a list that can drift.
 */

export const TRIP_TYPES = [
  { value: "beach house", label: "Beach house", emoji: "🏖️" },
  { value: "ski cabin", label: "Ski cabin", emoji: "⛷️" },
  { value: "city trip", label: "City trip", emoji: "🏙️" },
  { value: "national park", label: "National park", emoji: "🏔️" },
  { value: "cruise", label: "Cruise", emoji: "🚢" },
  { value: "road trip", label: "Road trip", emoji: "🚗" },
  { value: "honeymoon", label: "Honeymoon", emoji: "💍" },
  { value: "camping", label: "Camping", emoji: "⛺" },
  { value: "villa", label: "Villa / resort", emoji: "🏡" },
  { value: "other", label: "Other", emoji: "✈️" },
];

export const VIBES: { value: TripVibe; label: string; emoji: string }[] = [
  { value: "laid-back", label: "Laid-back", emoji: "🛋️" },
  { value: "adventurous", label: "Adventurous", emoji: "🧗" },
  { value: "foodie", label: "Foodie", emoji: "🍽️" },
  { value: "nature", label: "Nature", emoji: "🌿" },
  { value: "cultural", label: "Cultural", emoji: "🏛️" },
  { value: "family-fun", label: "Family fun", emoji: "🎡" },
  { value: "nightlife", label: "Nightlife", emoji: "🍸" },
  { value: "live-music", label: "Live music", emoji: "🎶" },
];

export const PLANNING: { value: PlanningStyle; label: string; desc: string }[] = [
  { value: "structured", label: "Structured", desc: "Every hour planned" },
  { value: "balanced", label: "Balanced", desc: "Some plans, some flow" },
  { value: "flexible", label: "Flexible", desc: "Go with the vibe" },
];

export const BUDGET: { value: BudgetTier; label: string; desc: string; emoji: string }[] = [
  { value: "budget", label: "Budget", desc: "Keep costs down", emoji: "💸" },
  { value: "moderate", label: "Moderate", desc: "Treat ourselves a bit", emoji: "💰" },
  { value: "splurge", label: "Splurge", desc: "No holding back", emoji: "✨" },
];

export const TRAVEL: { value: TravelMethod; label: string; emoji: string }[] = [
  { value: "car", label: "Car", emoji: "🚗" },
  { value: "plane", label: "Plane", emoji: "✈️" },
  { value: "train", label: "Train", emoji: "🚂" },
  { value: "other", label: "Other", emoji: "🚌" },
];

export const COOK_RATIO: { value: CookInRatio; label: string; desc: string; emoji: string }[] = [
  { value: "mostly-in", label: "Mostly cook in", desc: "Groceries + recipes", emoji: "🍳" },
  { value: "mix", label: "Mix it up", desc: "Some of both", emoji: "🔀" },
  { value: "mostly-out", label: "Mostly eat out", desc: "Restaurants & takeout", emoji: "🍽️" },
];

export const DIETARY = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Nut allergy", "Halal", "Kosher", "Shellfish-free"];

export const CUISINES = ["American", "Italian", "Mexican", "Asian", "Mediterranean", "BBQ", "Seafood", "Farm-to-table", "Comfort food", "Brunch"];

export const SECTIONS: { value: TripSection; label: string; desc: string; emoji: string }[] = [
  { value: "itinerary", label: "Daily itinerary", desc: "Day-by-day activity plan", emoji: "📅" },
  { value: "meals", label: "Meal plan", desc: "Breakfast, lunch & dinner", emoji: "🍴" },
  { value: "grocery", label: "Grocery list", desc: "Organized shopping list", emoji: "🛒" },
  { value: "restaurants", label: "Restaurant picks", desc: "Local spots to try", emoji: "🍜" },
  { value: "activities", label: "Activities & tips", desc: "Things to do & local intel", emoji: "🎯" },
  { value: "packing", label: "Packing list", desc: "Tailored to your trip", emoji: "🧳" },
];

export const AMENITIES = ["Full kitchen", "Gas grill", "Pool", "Hot tub", "Beach access", "Washer/dryer", "Fire pit", "Game room", "Outdoor shower", "Kayaks/paddleboards"];

export const DEFAULT_SECTIONS: TripSection[] = ["itinerary", "meals", "grocery", "restaurants", "activities", "packing"];
