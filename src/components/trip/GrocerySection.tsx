"use client";
import { useState } from "react";
import { NormalizedTrip, RecipeIngredient } from "@/types/trip";
import { deduplicateIngredients } from "@/core/ingredients";

interface Props { trip: NormalizedTrip }

const CATEGORY_EMOJI: Record<string, string> = {
  produce: "🥦", meat: "🥩", seafood: "🐟", dairy: "🧀",
  pantry: "🫙", drinks: "🧃", supplies: "🧻", frozen: "🧊",
  bakery: "🍞",
};

function IngredientRow({ ing }: { ing: RecipeIngredient }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.375rem 0", borderBottom: "1px solid var(--color-border)", fontSize: "0.875rem" }}>
      <span style={{ color: "var(--color-text)" }}>{ing.item}</span>
      <span style={{ color: "var(--color-text-muted)", fontWeight: 500, marginLeft: "1rem", whiteSpace: "nowrap" }}>{ing.amount} {ing.unit}</span>
    </div>
  );
}

export default function GrocerySection({ trip }: Props) {
  const [view, setView] = useState<"by-meal" | "master">("by-meal");
  const { groceryList } = trip;

  // Master list: merge the same item across every meal, then group by aisle.
  // Without the dedupe pass an ingredient used in five recipes showed up five
  // separate times.
  const allIngredients: RecipeIngredient[] = deduplicateIngredients([
    ...groceryList.byMeal.flatMap((m) => m.ingredients),
    ...groceryList.staples,
  ]);
  const byCategory = allIngredients.reduce<Record<string, RecipeIngredient[]>>((acc, ing) => {
    const key = ing.category ?? "pantry";
    if (!acc[key]) acc[key] = [];
    acc[key].push(ing);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-text)" }}>
          Grocery List
        </h2>
        <div role="group" aria-label="Grocery list view" style={{ display: "flex", gap: "0.375rem", background: "var(--color-border)", borderRadius: "8px", padding: "0.25rem" }}>
          {(["by-meal", "master"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                background: view === v ? "var(--color-bg-card)" : "transparent",
                color: view === v ? "var(--color-text)" : "var(--color-text-muted)",
                fontSize: "0.875rem",
                fontWeight: view === v ? 600 : 400,
                cursor: "pointer",
                boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
              }}
            >
              {v === "by-meal" ? "By meal" : "Master list"}
            </button>
          ))}
        </div>
      </div>

      {groceryList.shoppingNote && (
        <p style={{ padding: "0.75rem 1rem", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
          💡 {groceryList.shoppingNote}
        </p>
      )}

      {view === "by-meal" ? (
        <div>
          {groceryList.byMeal.map((m, i) => (
            <div key={i} style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
                Day {m.day} · {m.mealType.charAt(0).toUpperCase() + m.mealType.slice(1)} — {m.mealName}
              </h3>
              {m.ingredients.map((ing, j) => <IngredientRow key={j} ing={ing} />)}
            </div>
          ))}
          {groceryList.staples.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>Staples & extras</h3>
              {groceryList.staples.map((ing, j) => <IngredientRow key={j} ing={ing} />)}
            </div>
          )}
        </div>
      ) : (
        <div>
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span>{CATEGORY_EMOJI[cat] ?? "🛒"}</span>
                <span style={{ textTransform: "capitalize" }}>{cat}</span>
              </h3>
              {items.map((ing, j) => <IngredientRow key={j} ing={ing} />)}
            </div>
          ))}
        </div>
      )}

      {groceryList.stores.length > 0 && (
        <div style={{ marginTop: "2rem", padding: "1rem 1.25rem", background: "var(--color-bg)", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
          <h3 style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", marginBottom: "0.625rem" }}>Where to shop</h3>
          {groceryList.stores.map((s, i) => (
            <div key={i} style={{ marginBottom: "0.5rem" }}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontWeight: 500, color: "var(--color-brand)", fontSize: "0.875rem", textDecoration: "underline" }}
              >
                {s.name} <span aria-label="opens in new tab">↗</span>
              </a>
              {s.note && <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}> — {s.note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
