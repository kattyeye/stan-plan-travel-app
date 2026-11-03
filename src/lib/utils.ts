import type { AggregatedIngredient, Recipe, RecipeIngredient } from "@/types/trip";

// ─── Quantities ──────────────────────────────────────────────────────────────

/** Parses "2", "1/2", "1 1/2", "1.5", "½". Returns undefined for "to taste", "a pinch", ranges, etc. */
export function parseAmount(amount: string): number | undefined {
  const v = amount
    .trim()
    .replace(/½/g, " 1/2")
    .replace(/¼/g, " 1/4")
    .replace(/¾/g, " 3/4")
    .replace(/⅓/g, " 1/3")
    .replace(/⅔/g, " 2/3")
    .trim();
  if (!v) return undefined;
  const mixed = v.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = v.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[2]) === 0 ? undefined : parseInt(frac[1]) / parseInt(frac[2]);
  if (/^\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  return undefined;
}

const FRACTIONS: [number, string][] = [
  [0.125, "1/8"],
  [0.25, "1/4"],
  [1 / 3, "1/3"],
  [0.5, "1/2"],
  [2 / 3, "2/3"],
  [0.75, "3/4"],
];

/** 1.5 → "1 1/2", 0.33 → "1/3", 2.7 → "2.7" */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "";
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  if (rest < 0.05) return String(whole);
  if (rest > 0.95) return String(whole + 1);
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.02);
  if (frac) return whole > 0 ? `${whole} ${frac[1]}` : frac[1];
  return String(Math.round(n * 10) / 10);
}

/** Units whose quantities must stay whole numbers (you can't buy 2.3 eggs). */
const COUNT_UNITS = /^(|whole|each|piece|pieces|pc|egg|eggs|can|cans|jar|jars|bottle|bottles|bag|bags|box|boxes|pack|packs|package|packages|loaf|loaves|bunch|bunches|head|heads|clove|cloves|ear|ears|fillet|fillets|tortillas?|buns?|rolls?|slices?)$/i;

/**
 * Rescales a recipe to a new number of servings. LLMs are unreliable at
 * arithmetic, so we let the model write the recipe and do the math here.
 */
export function scaleRecipe(recipe: Recipe, servings: number): Recipe {
  if (!recipe.servings || recipe.servings === servings || servings <= 0) return { ...recipe, servings: servings || recipe.servings };
  const factor = servings / recipe.servings;
  return {
    ...recipe,
    servings,
    ingredients: recipe.ingredients.map((ing) => {
      const n = parseAmount(ing.amount);
      if (n === undefined) return ing;
      const scaled = n * factor;
      const amount = COUNT_UNITS.test(ing.unit.trim()) ? String(Math.max(1, Math.ceil(scaled - 0.05))) : formatAmount(scaled);
      return { ...ing, amount };
    }),
  };
}

// ─── Grocery aggregation ─────────────────────────────────────────────────────

function normalizeItem(item: string): string {
  return item
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/,.*$/, "")
    .replace(/\b(fresh|large|medium|small|chopped|diced|minced|sliced|optional)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ies$/, "y")
    .replace(/oes$/, "o")
    .replace(/(?<=[a-z]{2}[^s])s$/, "");
}

function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().trim().replace(/\.$/, "");
  const map: Record<string, string> = {
    tablespoon: "tbsp", tablespoons: "tbsp", tbs: "tbsp", tbsps: "tbsp",
    teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp",
    cups: "cup", lbs: "lb", pound: "lb", pounds: "lb", ounces: "oz", ounce: "oz",
    grams: "g", gram: "g", kilograms: "kg", kilogram: "kg", liters: "l", litres: "l", liter: "l",
    milliliters: "ml", millilitres: "ml", cloves: "clove", cans: "can", whole: "", each: "",
  };
  return map[u] ?? u;
}

/**
 * One combined shopping list: same item + same unit are summed; mismatched
 * units are listed side by side ("2 cups + 3 tbsp") rather than guessed.
 */
export function aggregateIngredients(
  sources: { recipeId?: string; ingredients: RecipeIngredient[] }[]
): AggregatedIngredient[] {
  const groups = new Map<
    string,
    { item: string; category: RecipeIngredient["category"]; byUnit: Map<string, { total: number; text: string[] }>; usedIn: Set<string> }
  >();

  for (const src of sources) {
    for (const ing of src.ingredients) {
      const key = normalizeItem(ing.item);
      if (!key) continue;
      const g = groups.get(key) ?? { item: ing.item.trim(), category: ing.category ?? "pantry", byUnit: new Map(), usedIn: new Set<string>() };
      const unit = normalizeUnit(ing.unit ?? "");
      const entry = g.byUnit.get(unit) ?? { total: 0, text: [] };
      const n = parseAmount(ing.amount ?? "");
      if (n !== undefined) entry.total += n;
      else if (ing.amount?.trim()) entry.text.push(ing.amount.trim());
      g.byUnit.set(unit, entry);
      if (src.recipeId) g.usedIn.add(src.recipeId);
      groups.set(key, g);
    }
  }

  const order: RecipeIngredient["category"][] = ["produce", "meat", "seafood", "dairy", "bakery", "frozen", "pantry", "drinks", "supplies"];
  return [...groups.values()]
    .map((g) => ({
      item: g.item,
      category: g.category,
      usedIn: [...g.usedIn],
      quantity: [...g.byUnit.entries()]
        .map(([unit, e]) => {
          const parts: string[] = [];
          if (e.total > 0) parts.push([formatAmount(e.total), unit].filter(Boolean).join(" "));
          for (const t of new Set(e.text)) parts.push([t, unit].filter(Boolean).join(" "));
          return parts.join(" + ");
        })
        .filter(Boolean)
        .join(" + "),
    }))
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.item.localeCompare(b.item));
}

/** @deprecated kept for older imports — use aggregateIngredients. */
export function deduplicateIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  return aggregateIngredients([{ ingredients }]).map((a) => ({
    item: a.item,
    amount: a.quantity,
    unit: "",
    category: a.category,
  }));
}

// ─── Dates ───────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${m}-${d}-${y}`;
}

export function calcNights(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
