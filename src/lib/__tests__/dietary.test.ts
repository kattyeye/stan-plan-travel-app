import { describe, expect, it } from "vitest";
import { findDietaryConflicts, rulesFor } from "../pipeline/dietary";
import type { Recipe } from "@/types/trip";

const recipe = (ingredients: [string, Recipe["ingredients"][number]["category"]][], notes: string[] = []): Recipe => ({
  id: "r1", name: "Test", mealType: "dinner", day: 1, servings: 4, prepTime: "", cookTime: "", difficulty: "easy", tip: "", tags: [], steps: [],
  dietaryNotes: notes,
  ingredients: ingredients.map(([item, category]) => ({ item, category, amount: "1", unit: "" })),
});

describe("dietary checks", () => {
  it("flags allergens even when notes mention them", () => {
    const c = findDietaryConflicts([recipe([["peanut butter", "pantry"], ["bread", "bakery"]], ["peanut allergy: skip it"])], ["Peanut allergy"]);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ severity: "allergy", addressed: false, ingredients: ["peanut butter"] });
  });

  it("accepts preference conflicts that are explained", () => {
    const c = findDietaryConflicts([recipe([["feta cheese", "dairy"]], ["vegetarian as written", "vegan: leave the feta off one plate"])], ["vegan"]);
    expect(c[0].addressed).toBe(true);
  });

  it("understands safe substitutions", () => {
    expect(findDietaryConflicts([recipe([["gluten-free pasta", "pantry"], ["corn tortillas", "bakery"]])], ["gluten-free"])).toHaveLength(0);
    expect(findDietaryConflicts([recipe([["butternut squash", "produce"], ["nutmeg", "pantry"]])], ["tree nut allergy"])).toHaveLength(0);
    expect(findDietaryConflicts([recipe([["shrimp", "seafood"]])], ["shellfish allergy"])).toHaveLength(1);
  });

  it("maps free-text restrictions to rules", () => {
    expect(rulesFor(["vegan", "vegetarian"]).map((r) => r.label)).toEqual(["vegan"]);
    expect(rulesFor(["celiac"]).map((r) => r.label)).toEqual(["gluten-free"]);
    expect(rulesFor(["peanut allergy"]).map((r) => r.label)).toEqual(["peanut allergy"]);
  });
});
