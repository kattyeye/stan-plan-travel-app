/**
 * Grocery ingredient consolidation.
 *
 * The "master list" view concatenates the ingredients of every recipe, so an
 * item used across several meals appeared once per meal. This merges same
 * item + same unit into one line with a summed amount.
 *
 * Platform-free — safe to import from React Native.
 */

import type { RecipeIngredient } from "./types";

const CATEGORY_ORDER: RecipeIngredient["category"][] = [
  "produce", "meat", "seafood", "dairy", "bakery", "frozen", "pantry", "drinks", "supplies",
];

/** Common cooking fractions, for both parsing and display. */
const FRACTIONS: Record<string, number> = {
  "1/8": 0.125, "1/4": 0.25, "1/3": 1 / 3, "3/8": 0.375, "1/2": 0.5,
  "5/8": 0.625, "2/3": 2 / 3, "3/4": 0.75, "7/8": 0.875,
};

/**
 * Parse a written amount into a number, or null when it isn't countable
 * ("a pinch", "to taste").
 *
 * Ranges resolve to the upper bound: buying too little is the worse failure
 * when you're cooking for a group in a rental kitchen.
 */
export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase().replace(/[~≈]/g, "");
  if (!text) return null;

  const range = text.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)$/);
  if (range) return Number(range[2]);

  // "1 1/2"
  const mixed = text.match(/^(\d+)\s+(\d+\/\d+)$/);
  if (mixed && FRACTIONS[mixed[2]] !== undefined) return Number(mixed[1]) + FRACTIONS[mixed[2]];

  if (FRACTIONS[text] !== undefined) return FRACTIONS[text];

  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }

  const plain = text.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return Number(plain[1]);

  return null;
}

/** Render a number back as a cook-friendly amount ("1 1/2", not "1.5"). */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  const whole = Math.floor(value);
  const remainder = value - whole;

  if (remainder < 0.01) return String(whole);

  for (const [label, amount] of Object.entries(FRACTIONS)) {
    if (Math.abs(remainder - amount) < 0.02) {
      return whole === 0 ? label : `${whole} ${label}`;
    }
  }
  return String(Math.round(value * 100) / 100);
}

/** Singularize a unit so "cup" and "cups" merge. Empty units stay empty. */
function normalizeUnit(unit: string | undefined): string {
  const text = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!text) return "";
  if (/(s|es)$/.test(text) && text.length > 2) {
    return text.replace(/es$/, "e").replace(/s$/, "");
  }
  return text;
}

function normalizeItem(item: string): string {
  return item.trim().toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ");
}

/**
 * Merge duplicate ingredients, sum what can be summed, and sort by the order
 * you actually walk a grocery store.
 *
 * Amounts that can't be added ("a pinch" + "2") are preserved side by side
 * rather than silently dropped — a wrong quantity is worse than an ugly one.
 */
export function deduplicateIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  const merged = new Map<string, { ingredient: RecipeIngredient; total: number | null; extras: string[] }>();

  for (const ingredient of ingredients ?? []) {
    if (!ingredient?.item) continue;

    const unit = normalizeUnit(ingredient.unit);
    const key = `${normalizeItem(ingredient.item)}::${unit}`;
    const amount = parseAmount(ingredient.amount);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ingredient: { ...ingredient },
        total: amount,
        extras: amount === null && ingredient.amount ? [ingredient.amount.trim()] : [],
      });
      continue;
    }

    if (amount !== null) {
      existing.total = existing.total === null ? amount : existing.total + amount;
    } else if (ingredient.amount) {
      const text = ingredient.amount.trim();
      if (!existing.extras.includes(text)) existing.extras.push(text);
    }

    // Keep the first store note we see rather than losing it in the merge.
    if (!existing.ingredient.storeNote && ingredient.storeNote) {
      existing.ingredient.storeNote = ingredient.storeNote;
    }
  }

  const result = [...merged.values()].map(({ ingredient, total, extras }) => {
    const parts: string[] = [];
    if (total !== null) parts.push(formatAmount(total));
    parts.push(...extras);
    return { ...ingredient, amount: parts.join(" + ") };
  });

  return result.sort((a, b) => {
    const categoryDelta =
      CATEGORY_ORDER.indexOf(a.category ?? "pantry") - CATEGORY_ORDER.indexOf(b.category ?? "pantry");
    if (categoryDelta !== 0) return categoryDelta;
    return a.item.localeCompare(b.item);
  });
}
