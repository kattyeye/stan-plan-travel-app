import type { AggregatedIngredient, GeneratedTrip, PackingItem } from "@/types/trip";
import { aggregateIngredients } from "@/lib/utils";

/** Storage keys and initial state for the packing and grocery checklists (shared by Lists and Overview). */

export const packingStorageKey = (slug: string | undefined, trip: GeneratedTrip) => `irie:${slug ?? trip.meta.title}:packing`;
export const groceryStorageKey = (slug: string | undefined, trip: GeneratedTrip) => `irie:${slug ?? trip.meta.title}:grocery`;

export function packingInitial(packing: GeneratedTrip["packingList"]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const [section, items] of Object.entries(packing) as [keyof typeof packing, PackingItem[]][]) {
    for (const item of items) state[`${section}::${item.item}`] = item.propertyProvides ?? false;
  }
  return state;
}

export function groceryMaster(trip: GeneratedTrip): AggregatedIngredient[] {
  const g = trip.groceryList;
  return g.master ?? aggregateIngredients([...g.byMeal.map((m) => ({ recipeId: m.recipeId, ingredients: m.ingredients })), { ingredients: g.staples }]);
}
