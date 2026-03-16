import { RecipeIngredient } from "@/types/trip";

export function deduplicateIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  // TODO: group by item+unit, sum quantities, sort by category
  return ingredients;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export function calcNights(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
