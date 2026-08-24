import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { deduplicateIngredients, formatAmount, parseAmount } from "../ingredients";
import type { RecipeIngredient } from "../types";

const ing = (
  item: string, amount: string, unit = "", category: RecipeIngredient["category"] = "pantry",
): RecipeIngredient => ({ item, amount, unit, category });

describe("parseAmount", () => {
  it("parses plain numbers, decimals, fractions and mixed numbers", () => {
    assert.equal(parseAmount("2"), 2);
    assert.equal(parseAmount("1.5"), 1.5);
    assert.equal(parseAmount("1/2"), 0.5);
    assert.equal(parseAmount("1 1/2"), 1.5);
  });

  it("resolves a range to its upper bound — under-buying is the worse error", () => {
    assert.equal(parseAmount("2-3"), 3);
    assert.equal(parseAmount("2 to 3"), 3);
  });

  it("returns null for uncountable amounts", () => {
    assert.equal(parseAmount("a pinch"), null);
    assert.equal(parseAmount("to taste"), null);
    assert.equal(parseAmount(undefined), null);
    assert.equal(parseAmount("1/0"), null);
  });
});

describe("formatAmount", () => {
  it("renders cook-friendly fractions rather than decimals", () => {
    assert.equal(formatAmount(3), "3");
    assert.equal(formatAmount(0.5), "1/2");
    assert.equal(formatAmount(1.5), "1 1/2");
    assert.equal(formatAmount(2.25), "2 1/4");
  });
});

describe("deduplicateIngredients", () => {
  it("merges the same item across meals and sums the amounts", () => {
    const out = deduplicateIngredients([
      ing("Lemons", "2", "", "produce"),
      ing("lemons", "3", "", "produce"),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].amount, "5");
  });

  it("treats singular and plural units as the same unit", () => {
    const out = deduplicateIngredients([
      ing("Olive oil", "1", "cup", "pantry"),
      ing("Olive oil", "1/2", "cups", "pantry"),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].amount, "1 1/2");
  });

  it("keeps different units apart — 1 cup and 1 tbsp are not 2 of anything", () => {
    const out = deduplicateIngredients([
      ing("Butter", "1", "cup", "dairy"),
      ing("Butter", "1", "tbsp", "dairy"),
    ]);
    assert.equal(out.length, 2);
  });

  it("preserves uncountable amounts instead of dropping them", () => {
    const out = deduplicateIngredients([
      ing("Salt", "1", "tsp", "pantry"),
      ing("Salt", "a pinch", "tsp", "pantry"),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].amount, "1 + a pinch");
  });

  it("sorts by grocery-store order, then alphabetically", () => {
    const out = deduplicateIngredients([
      ing("Rice", "1", "bag", "pantry"),
      ing("Shrimp", "2", "lb", "seafood"),
      ing("Apples", "4", "", "produce"),
      ing("Bananas", "3", "", "produce"),
    ]);
    assert.deepEqual(out.map((i) => i.item), ["Apples", "Bananas", "Shrimp", "Rice"]);
  });

  it("keeps a store note that would otherwise be lost in the merge", () => {
    const out = deduplicateIngredients([
      { ...ing("Shrimp", "1", "lb", "seafood") },
      { ...ing("Shrimp", "1", "lb", "seafood"), storeNote: "Ask the fish counter" },
    ]);
    assert.equal(out[0].storeNote, "Ask the fish counter");
    assert.equal(out[0].amount, "2");
  });

  it("ignores malformed entries without throwing", () => {
    const out = deduplicateIngredients([
      ing("Rice", "1", "bag"),
      { item: "", amount: "1", unit: "", category: "pantry" },
    ]);
    assert.equal(out.length, 1);
  });
});
