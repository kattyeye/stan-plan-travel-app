import { RecipeIngredient } from "@/types/trip";

export function deduplicateIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  // TODO: group by item+unit, sum quantities, sort by category
  return ingredients;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${m}-${d}-${y}`;
}

export function calcNights(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
