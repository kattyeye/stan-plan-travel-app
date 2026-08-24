// Implementation lives in src/core so React Native can reuse it.
export { deduplicateIngredients, parseAmount, formatAmount } from "@/core/ingredients";

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${m}-${d}-${y}`;
}

export function calcNights(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
