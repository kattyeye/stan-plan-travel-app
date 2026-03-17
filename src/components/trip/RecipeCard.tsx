"use client";
import { useState } from "react";
import { Recipe } from "@/types/trip";

interface Props { recipe: Recipe }

export default function RecipeCard({ recipe }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      border: "1px solid var(--color-border)",
      borderRadius: "10px",
      overflow: "hidden",
      background: "var(--color-bg-card)",
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1.125rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "0.75rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: "var(--color-tea-green-900)", fontSize: "0.9375rem" }}>{recipe.name}</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.125rem" }}>
            Prep {recipe.prepTime} · Cook {recipe.cookTime} · Serves {recipe.servings}
          </div>
        </div>
        <span style={{ color: "var(--color-text-faint)", fontSize: "0.875rem", flexShrink: 0 }}>
          {open ? "▲ Hide" : "▼ Recipe"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 1.125rem 1.125rem", borderTop: "1px solid var(--color-border)" }}>
          {recipe.tip && (
            <p style={{ padding: "0.625rem 0.875rem", background: "var(--color-bg)", borderRadius: "8px", color: "var(--color-text-muted)", fontSize: "0.875rem", margin: "0.875rem 0" }}>
              💡 {recipe.tip}
            </p>
          )}

          <h4 style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem", marginTop: "1rem", marginBottom: "0.5rem" }}>Ingredients</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--color-text)", padding: "0.25rem 0", borderBottom: "1px solid var(--color-border)" }}>
                <span>{ing.item}</span>
                <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>{ing.amount} {ing.unit}</span>
              </li>
            ))}
          </ul>

          <h4 style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem", marginTop: "1rem", marginBottom: "0.5rem" }}>Steps</h4>
          <ol style={{ padding: "0 0 0 1.25rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recipe.steps.map((s) => (
              <li key={s.step} style={{ fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.5 }}>
                {s.instruction}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
