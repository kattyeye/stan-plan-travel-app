import type { Recipe } from "@/types/trip";

/**
 * Deterministic dietary checks on recipes. The model is told about the
 * group's needs; this double-checks the ingredient list it actually wrote.
 *
 * A conflict is acceptable for preferences when the recipe explains how to
 * adapt one plate (the restriction may apply to one person). Allergies and
 * celiac are never acceptable.
 */

interface Rule {
  label: string;
  /** Matches restriction text typed or chosen in the wizard. */
  matches: RegExp;
  /** Ingredient patterns that conflict. */
  conflicts: RegExp;
  /** Ingredient text that makes an otherwise-conflicting match safe ("gluten-free pasta"). */
  safe?: RegExp;
  categories?: string[];
  severity: "allergy" | "preference";
}

const MEAT = /\b(chicken|beef|steak|pork|bacon|ham|prosciutto|pancetta|sausage|chorizo|salami|pepperoni|turkey|lamb|veal|duck|venison|bison|brisket|ground meat|meatball|hot dog|gelatin|lard)\b/i;
const SEAFOOD = /\b(fish|salmon|tuna|cod|halibut|mahi|snapper|tilapia|trout|anchov|sardine|shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster|squid|calamari|octopus|crawfish|fish sauce)\w*/i;
const DAIRY = /\b(milk|cheese|butter|cream|yogurt|yoghurt|ghee|parmesan|mozzarella|cheddar|feta|ricotta|brie|sour cream|creme fraiche|crème fraîche|half-and-half|buttermilk|whey|queso)\b/i;
const GLUTEN = /\b(flour|bread|breadcrumbs|panko|pasta|spaghetti|penne|linguine|fettuccine|macaroni|noodles?|couscous|bulgur|barley|farro|rye|seitan|tortillas?|pita|naan|bagels?|buns?|rolls?|croutons|crackers|pizza dough|pie crust|biscuits?|beer|soy sauce|teriyaki|graham|wheat|orzo|gnocchi|ramen|udon|pancake mix|brioche|sourdough|baguette|croissant)\b/i;
const TREE_NUTS = /\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|pine nuts?|brazil nuts?|nut butter|almond (milk|flour|butter)|pesto|praline|marzipan|nutella)\b/i;
const PEANUTS = /\b(peanuts?|peanut butter|satay)\b/i;
const SHELLFISH = /\b(shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?|crawfish|crayfish|langoustine)\b/i;
const EGG = /\b(eggs?|mayonnaise|mayo|aioli|meringue)\b/i;
const PORK = /\b(pork|bacon|ham|prosciutto|pancetta|chorizo|salami|pepperoni|lard|gelatin)\b/i;
const ALCOHOL = /\b(wine|beer|rum|vodka|tequila|bourbon|whiskey|brandy|sake|mirin|liqueur)\b/i;

const RULES: Rule[] = [
  { label: "vegan", matches: /vegan|plant[- ]based/i, conflicts: new RegExp(`${MEAT.source}|${SEAFOOD.source}|${DAIRY.source}|${EGG.source}|\\bhoney\\b`, "i"), safe: /\b(vegan|plant[- ]based|dairy[- ]free|oat|almond milk|coconut|soy milk|vegetable broth|egg[- ]free|flax egg)\b/i, categories: ["meat", "seafood", "dairy"], severity: "preference" },
  { label: "vegetarian", matches: /vegetarian|veggie/i, conflicts: new RegExp(`${MEAT.source}|${SEAFOOD.source}`, "i"), safe: /\b(vegetarian|plant[- ]based|meatless|impossible|beyond|veggie|vegetable broth)\b/i, categories: ["meat", "seafood"], severity: "preference" },
  { label: "pescatarian", matches: /pescatarian|pescetarian/i, conflicts: MEAT, safe: /\b(vegetarian|plant[- ]based|veggie|vegetable broth)\b/i, categories: ["meat"], severity: "preference" },
  { label: "gluten-free", matches: /gluten|celiac|coeliac/i, conflicts: GLUTEN, safe: /\b(gluten[- ]free|gf|corn tortillas?|rice noodles?|rice paper|tamari|coconut aminos|cauliflower|lettuce wrap|polenta)\b/i, severity: "allergy" },
  { label: "dairy-free", matches: /dairy|lactose/i, conflicts: DAIRY, safe: /\b(dairy[- ]free|vegan|lactose[- ]free|oat|almond|coconut|soy|cocoa butter|peanut butter|nut butter|cream of tartar|apple butter)\b/i, categories: ["dairy"], severity: "preference" },
  { label: "nut allergy", matches: /tree[- ]?nut|nut[- ]free|nut allerg|\bnuts?\b/i, conflicts: new RegExp(`${TREE_NUTS.source}|${PEANUTS.source}`, "i"), safe: /\b(nut[- ]free|coconut|butternut|nutmeg|water chestnut|sunflower seed butter)\b/i, severity: "allergy" },
  { label: "peanut allergy", matches: /peanut/i, conflicts: PEANUTS, safe: /\b(peanut[- ]free|sunflower seed butter)\b/i, severity: "allergy" },
  { label: "shellfish allergy", matches: /shellfish|crustacean/i, conflicts: SHELLFISH, severity: "allergy" },
  { label: "egg allergy", matches: /\begg/i, conflicts: EGG, safe: /\b(egg[- ]free|vegan mayo|eggplant)\b/i, severity: "allergy" },
  { label: "halal", matches: /halal/i, conflicts: new RegExp(`${PORK.source}|${ALCOHOL.source}`, "i"), safe: /\b(halal|turkey bacon|beef bacon|non-alcoholic|alcohol-free)\b/i, severity: "preference" },
  { label: "kosher", matches: /kosher/i, conflicts: new RegExp(`${PORK.source}|${SHELLFISH.source}`, "i"), safe: /\b(kosher|turkey bacon|beef bacon)\b/i, severity: "preference" },
  { label: "no pork", matches: /no pork|pork[- ]free/i, conflicts: PORK, safe: /\b(turkey bacon|beef bacon|pork[- ]free)\b/i, severity: "preference" },
];

export interface DietaryConflict {
  recipeId: string;
  recipeName: string;
  restriction: string;
  severity: "allergy" | "preference";
  ingredients: string[];
  /** True when the recipe's notes explain how to adapt it. */
  addressed: boolean;
}

export function rulesFor(restrictions: string[]): Rule[] {
  const found = new Map<string, Rule>();
  for (const r of restrictions) {
    for (const rule of RULES) {
      // "nut allergy" shouldn't also trigger on "peanut" alone, and vice versa.
      if (rule.label === "nut allergy" && /^peanut/i.test(r.trim())) continue;
      if (rule.matches.test(r)) found.set(rule.label, rule);
    }
  }
  // Vegan implies vegetarian checks; avoid double-reporting.
  if (found.has("vegan")) found.delete("vegetarian");
  return [...found.values()];
}

export function findDietaryConflicts(recipes: Recipe[], restrictions: string[]): DietaryConflict[] {
  const rules = rulesFor(restrictions);
  if (rules.length === 0) return [];
  const out: DietaryConflict[] = [];
  for (const recipe of recipes) {
    const notes = [recipe.tip, ...(recipe.dietaryNotes ?? [])].join(" ").toLowerCase();
    for (const rule of rules) {
      const hits = recipe.ingredients
        .filter((ing) => {
          const text = `${ing.item}`;
          if (rule.safe?.test(text)) return false;
          return rule.conflicts.test(text) || (rule.categories?.includes(ing.category) ?? false);
        })
        .map((ing) => ing.item);
      if (hits.length === 0) continue;
      const keyword = rule.label === "no pork" ? "pork" : rule.label.split(" ")[0].replace(/-free$/, "");
      const addressed = rule.severity === "preference" && notes.includes(keyword);
      out.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        restriction: rule.label,
        severity: rule.severity,
        ingredients: [...new Set(hits)],
        addressed,
      });
    }
  }
  return out;
}
