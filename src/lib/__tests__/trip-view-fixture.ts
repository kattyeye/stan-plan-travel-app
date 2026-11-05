import type { GeneratedTrip, Restaurant } from "@/types/trip";

const verified = (placeId: string, hours?: string[], openDays?: number[]) => ({
  status: "verified" as const,
  provider: "google_places" as const,
  checkedAt: "2030-06-01T12:00:00Z",
  placeId,
  mapsUrl: `https://maps.google.com/?cid=${placeId}`,
  rating: 4.6,
  reviewCount: 1240,
  hours,
  openDays,
});

const restaurant = (id: string, name: string, over: Partial<Restaurant> = {}): Restaurant => ({
  id,
  name,
  address: "1 Beach Rd, Nags Head, NC",
  hours: "",
  tags: ["seafood"],
  description: "Good food.",
  priceRange: "$$",
  bestFor: ["lunch", "dinner"],
  ...over,
});

/** A small v2 trip: Fri 2030-06-14 → Sun 2030-06-16, structured, with ids. */
export function tripFixture(over: Partial<GeneratedTrip> = {}): GeneratedTrip {
  return {
    schemaVersion: 2,
    meta: {
      title: "OBX Weekend",
      destination: "Nags Head, NC",
      dates: { start: "2030-06-14", end: "2030-06-16", nights: 2 },
      group: { adults: 2, kids: 2, kidAges: [5, 8], totalPeople: 4 },
      property: "Oceanfront house",
      tripType: "beach house",
    },
    preferences: { planningStyle: "structured", budget: "moderate", vibes: ["family-fun"], cookInRatio: "mix", dietaryRestrictions: ["peanut allergy"] },
    recipes: [
      {
        id: "rec-1",
        name: "Pancakes (buttermilk)",
        mealType: "breakfast",
        day: 1,
        servings: 4,
        prepTime: "10 min",
        cookTime: "15 min",
        difficulty: "easy",
        tip: "",
        ingredients: [{ item: "Flour", amount: "2", unit: "cups", category: "pantry" }],
        steps: [{ step: 1, instruction: "Mix." }],
        tags: [],
        dietaryNotes: ["peanut allergy: no nuts used"],
      },
    ],
    itinerary: [
      {
        day: 1,
        date: "2030-06-14",
        weekday: "Friday",
        theme: "Arrival & dunes",
        meals: {
          breakfast: { type: "cook-in", name: "Pancakes", recipeId: "rec-1", time: "8:00am" },
          lunch: { type: "eat-out", name: "Lunch at Sam & Omie's", restaurantId: "r1", time: "12:30pm", alternativeIds: ["r3"] },
          dinner: { type: "eat-out", name: "Dinner at Owens' Restaurant", restaurantId: "r2", time: "7:00pm" },
        },
        activities: [
          "10:00am — Climb Jockey's Ridge State Park dunes",
          "7:00pm — Dinner at Owens' Restaurant on the sound",
          "3:00pm — Pool time at the house",
        ],
        vibe: ["family-fun", "nature"],
      },
      {
        day: 2,
        date: "2030-06-15",
        weekday: "Saturday",
        theme: "Manteo",
        meals: {
          breakfast: { type: "cook-in", name: "Leftover pancakes", recipeId: "rec-1" },
          lunch: { type: "eat-out", name: "Lunch at Mulligan's", restaurantId: "r3" },
          dinner: { type: "eat-out", name: "Dinner at Sam & Omie's", restaurantId: "r1", warnings: ["Call ahead."] },
        },
        activities: ["Morning — Island Farm", "Evening — Sunset walk"],
        vibe: [],
      },
    ],
    restaurants: [
      restaurant("r1", "Sam & Omie's", { bestFor: ["breakfast", "lunch", "dinner"], verification: verified("P1", ["Friday: 7:00 AM – 9:00 PM", "Saturday: 7:00 AM – 10:00 PM"], [0, 1, 2, 3, 4, 5, 6]) }),
      restaurant("r2", "Owens' Restaurant", { bestFor: ["dinner"], priceRange: "$$$", verification: verified("P2", ["Friday: 5:00 PM – 9:30 PM"], [5]) }),
      restaurant("r3", "Mulligan's", { verification: { status: "web-sourced", provider: "web", checkedAt: "2030-06-01T12:00:00Z" }, sourceUrl: "https://example.com/mulligans" }),
    ],
    groceryList: { byMeal: [], staples: [], shoppingNote: "", stores: [] },
    tips: {
      activities: [
        { id: "a1", name: "Jockey's Ridge State Park", description: "Dunes.", bookingRequired: false, kidFriendly: true, tags: ["nature"], verification: verified("PA1") },
        { id: "a2", name: "Island Farm", description: "Farm.", bookingRequired: true, kidFriendly: true, tags: ["history"], address: "Manteo, NC" },
      ],
      practical: [],
      dayTrips: [],
    },
    packingList: { clothingAdults: [], clothingKids: [], beachOutdoor: [], kitchen: [], toiletries: [], electronics: [], evening: [], groupLogistics: [], propertyProvides: [] },
    ...over,
  };
}
