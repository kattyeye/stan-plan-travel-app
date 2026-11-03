import type { WizardData } from "@/types/trip";
import type { PlanDraft, ResearchBrief } from "../pipeline/schemas";

export const wizard = (over: Partial<WizardData> = {}): WizardData => ({
  destination: "Nags Head, NC",
  startDate: "2030-06-14", // a Friday
  endDate: "2030-06-17",
  nights: 3,
  tripType: "beach house",
  numAdults: 2,
  numKids: 2,
  kidAges: [5, 8],
  planningStyle: "structured",
  budget: "moderate",
  vibes: ["family-fun", "foodie"],
  travelMethod: "car",
  cookInRatio: "mix",
  dietaryRestrictions: ["peanut allergy"],
  cuisinePreferences: ["seafood"],
  propertyDescription: "Oceanfront house with a grill",
  propertyAmenities: ["grill", "beach access"],
  sections: ["itinerary", "meals", "grocery", "restaurants", "activities", "packing"],
  email: "guest@example.com",
  tripNickname: "OBX 2030",
  ...over,
});

const restaurant = (name: string, over: Partial<ResearchBrief["restaurants"][number]> = {}): ResearchBrief["restaurants"][number] => ({
  name,
  address: `1 Beach Rd, Nags Head, NC`,
  neighborhood: null,
  cuisine: "Seafood",
  priceRange: "$$",
  bestFor: ["lunch", "dinner"],
  closedDays: [],
  hoursSummary: "Daily 11am–9pm",
  kidFriendly: true,
  dietaryOptions: [],
  whyItFits: "Great fried shrimp and a sandbox for kids.",
  sourceUrl: `https://example.com/${name.toLowerCase().replace(/\W+/g, "-")}`,
  website: null,
  ...over,
});

export const brief = (): ResearchBrief => ({
  areaSummary: "Classic Outer Banks beach town.",
  weather: "Highs around 84°F, warm ocean.",
  restaurants: [
    restaurant("Sam & Omie's", { bestFor: ["breakfast", "lunch", "dinner"] }),
    // Closed Saturdays — day 2 (2030-06-15) is a Saturday.
    restaurant("Owens' Restaurant", { bestFor: ["dinner"], closedDays: ["Saturday"], priceRange: "$$$" }),
    restaurant("Mulligan's", { bestFor: ["lunch", "dinner"] }),
    restaurant("Duplicate Diner"),
    restaurant("Duplicate Diner"),
  ],
  activities: [
    {
      name: "Jockey's Ridge State Park",
      address: "Nags Head, NC",
      description: "Tallest living sand dune on the East Coast.",
      duration: "2 hours",
      cost: "Free",
      bookingRequired: false,
      kidFriendly: true,
      closedDays: [],
      bestTime: "Go at sunset.",
      tags: ["nature"],
      sourceUrl: "https://example.com/jockeys",
      website: null,
    },
    {
      name: "Island Farm",
      address: "Manteo, NC",
      description: "Living history farm.",
      duration: "1.5 hours",
      cost: "$12 adults",
      bookingRequired: false,
      kidFriendly: true,
      closedDays: ["Sunday", "Monday"],
      bestTime: null,
      tags: ["cultural"],
      sourceUrl: "https://example.com/island-farm",
      website: null,
    },
  ],
  groceryStores: [{ name: "Harris Teeter", address: null, type: "general", note: "Full grocery", sourceUrl: null }],
  events: [{ name: "Sunset Concert", dates: "Jun 15", description: "Free music", sourceUrl: "https://example.com/concert" }],
  dayTrips: [],
  practicalTips: ["Beach parking fills by 10am."],
});

const meal = (over: Partial<PlanDraft["days"][number]["meals"]["breakfast"]>): PlanDraft["days"][number]["meals"]["breakfast"] => ({
  type: "eat-out",
  name: "Out",
  restaurantId: null,
  recipeId: null,
  time: null,
  note: null,
  alternativeIds: [],
  ...over,
});

export const plan = (): PlanDraft => ({
  title: "Salt & Sand",
  days: [1, 2, 3, 4].map((d) => ({
    day: d,
    theme: `Day ${d} theme`,
    schedule: d === 3 ? ["10:00am — Island Farm visit"] : ["9:00am — Beach"],
    meals: {
      breakfast: meal({ type: "cook-in", name: "Pancakes", recipeId: "rec-1", time: "8:00am" }),
      lunch: meal({ name: "Lunch at Mulligan's", restaurantId: "rest-3", time: "12:30pm" }),
      dinner:
        d === 2
          ? meal({ name: "Dinner at Owens' Restaurant", restaurantId: "rest-2", time: "7:00pm" })
          : d === 3
            ? meal({ type: "cook-in", name: "Grilled fish tacos", recipeId: "rec-9", time: "6:30pm" })
            : meal({ name: "Dinner at Sam & Omie's", restaurantId: "rest-1", time: "6:00pm", alternativeIds: ["rest-999"] }),
    },
    vibe: ["family-fun"],
  })),
  recipes: [
    { id: "rec-1", name: "Pancakes", mealType: "breakfast", day: 1, brief: "Easy pancakes", dietaryApproach: "Peanut-free as written" },
    { id: "rec-2", name: "Unused recipe", mealType: "lunch", day: 2, brief: "Never referenced", dietaryApproach: "" },
  ],
  practicalTips: ["Book Owens' early."],
  staples: [{ item: "Coffee", amount: "1", unit: "bag", category: "pantry" }],
  shoppingNote: "Shop on day 1.",
});
