"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Recipe } from "@/types/trip";

interface Props {
  recipe: Recipe;
  /** The dish name is already shown above (timeline stops), so the toggle reads "Recipe". */
  compact?: boolean;
}

export default function RecipeCard({ recipe, compact }: Props) {
  const [open, setOpen] = useState(false);
  const flagged = recipe.dietaryNotes?.filter((n) => /^contains /i.test(n)) ?? [];
  const notes = recipe.dietaryNotes?.filter((n) => !/^contains /i.test(n)) ?? [];

  return (
    <div className="recipe-card" style={{ border: "1px solid var(--color-border)", borderRadius: "10px", overflow: "hidden", background: "var(--color-bg)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`recipe-body-${recipe.id}`}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: "0.75rem", color: "inherit" }}
      >
        <span>
          <span style={{ display: "block", fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{compact ? (open ? "Hide recipe" : "📖 Recipe") : recipe.name}</span>
          <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.125rem" }}>
            Prep {recipe.prepTime} · Cook {recipe.cookTime} · Serves {recipe.servings}
            {flagged.length > 0 && <span style={{ color: "var(--color-warning-text)", fontWeight: 600 }}> · check dietary note</span>}
          </span>
        </span>
        <ChevronDown size={16} aria-hidden="true" style={{ color: "var(--color-text-faint)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        <span className="sr-only">{open ? "Hide recipe" : "Show recipe"}</span>
      </button>

      <div id={`recipe-body-${recipe.id}`} hidden={!open} className="recipe-body" style={{ padding: "0 1rem 1rem", borderTop: "1px solid var(--color-border)" }}>
        {flagged.map((n) => (
          <p key={n} role="note" style={{ padding: "0.5rem 0.75rem", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "8px", color: "var(--color-warning-text)", fontSize: "0.8125rem", margin: "0.75rem 0 0" }}>
            ⚠ {n}
          </p>
        ))}
        {recipe.tip && (
          <p style={{ padding: "0.5rem 0.75rem", background: "var(--color-bg-card)", borderRadius: "8px", color: "var(--color-text-muted)", fontSize: "0.875rem", margin: "0.75rem 0 0" }}>
            <span aria-hidden="true">💡 </span>{recipe.tip}
          </p>
        )}
        {notes.length > 0 && (
          <ul style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
            {notes.map((n) => <li key={n}>🥗 {n}</li>)}
          </ul>
        )}

        <h4 style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem", margin: "1rem 0 0.5rem" }}>Ingredients</h4>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {recipe.ingredients.map((ing, i) => (
            <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.875rem", color: "var(--color-text)", padding: "0.3125rem 0", borderBottom: "1px solid var(--color-border)" }}>
              <span>{ing.item}</span>
              <span style={{ color: "var(--color-text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>{ing.amount} {ing.unit}</span>
            </li>
          ))}
        </ul>

        <h4 style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem", margin: "1rem 0 0.5rem" }}>Steps</h4>
        <ol style={{ padding: "0 0 0 1.25rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {recipe.steps.map((s) => (
            <li key={s.step} style={{ fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.55 }}>{s.instruction}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
