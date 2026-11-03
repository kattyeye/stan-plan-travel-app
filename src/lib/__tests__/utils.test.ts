import { describe, expect, it } from "vitest";
import { aggregateIngredients, formatAmount, parseAmount, scaleRecipe } from "../utils";
import type { Recipe } from "@/types/trip";

describe("quantities", () => {
  it("parses common amount formats", () => {
    expect(parseAmount("2")).toBe(2);
    expect(parseAmount("1/2")).toBe(0.5);
    expect(parseAmount("1 1/2")).toBe(1.5);
    expect(parseAmount("1.25")).toBe(1.25);
    expect(parseAmount("½")).toBe(0.5);
    expect(parseAmount("to taste")).toBeUndefined();
    expect(parseAmount("2-3")).toBeUndefined();
  });

  it("formats amounts as kitchen fractions", () => {
    expect(formatAmount(1.5)).toBe("1 1/2");
    expect(formatAmount(0.333)).toBe("1/3");
    expect(formatAmount(3)).toBe("3");
    expect(formatAmount(2.7)).toBe("2.7");
  });

  it("rescales recipes and keeps countable items whole", () => {
    const r: Recipe = {
      id: "r", name: "Eggs", mealType: "breakfast", day: 1, servings: 4, prepTime: "", cookTime: "", difficulty: "easy", tip: "", tags: [], steps: [],
      ingredients: [
        { item: "eggs", amount: "6", unit: "", category: "dairy" },
        { item: "milk", amount: "1/2", unit: "cup", category: "dairy" },
        { item: "salt", amount: "to taste", unit: "", category: "pantry" },
      ],
    };
    const scaled = scaleRecipe(r, 6);
    expect(scaled.servings).toBe(6);
    expect(scaled.ingredients[0].amount).toBe("9");
    expect(scaled.ingredients[1].amount).toBe("3/4");
    expect(scaled.ingredients[2].amount).toBe("to taste");
    expect(scaleRecipe(r, 4)).toEqual({ ...r, servings: 4 });
  });

  it("aggregates the shopping list across recipes", () => {
    const list = aggregateIngredients([
      { recipeId: "a", ingredients: [{ item: "Limes", amount: "2", unit: "", category: "produce" }, { item: "olive oil", amount: "2", unit: "tablespoons", category: "pantry" }] },
      { recipeId: "b", ingredients: [{ item: "lime", amount: "1", unit: "", category: "produce" }, { item: "Olive oil", amount: "1", unit: "tbsp", category: "pantry" }, { item: "Olive oil", amount: "1/4", unit: "cup", category: "pantry" }] },
    ]);
    const lime = list.find((l) => l.item.toLowerCase().startsWith("lime"))!;
    expect(lime.quantity).toBe("3");
    expect(lime.usedIn.sort()).toEqual(["a", "b"]);
    const oil = list.find((l) => l.item.toLowerCase() === "olive oil")!;
    expect(oil.quantity).toBe("3 tbsp + 1/4 cup");
    expect(list[0].category).toBe("produce");
  });
});
