import { AlertTriangle, MapPin } from "lucide-react";
import type { Meal, Recipe, Restaurant } from "@/types/trip";
import RecipeCard from "./RecipeCard";
import VerifiedBadge from "./VerifiedBadge";

interface Props {
  label: string;
  meal: Meal;
  recipes: Recipe[];
  restaurants: Map<string, Restaurant>;
}

/** One meal slot: what, when, where (with verification) or the recipe to cook. */
export default function MealRow({ label, meal, recipes, restaurants }: Props) {
  const recipe = meal.recipeId ? recipes.find((r) => r.id === meal.recipeId) : undefined;
  const venue = meal.restaurantId ? restaurants.get(meal.restaurantId) : meal.restaurant;
  const alternatives = (meal.alternativeIds ?? []).map((id) => restaurants.get(id)).filter((r): r is Restaurant => !!r);
  const mapsUrl = venue?.verification?.mapsUrl ?? (venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address ?? ""}`)}` : undefined);

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
        <span style={labelStyle}>{label}</span>
        {meal.time && <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-brand)" }}>{meal.time}</span>}
        {/* The recipe card already shows the dish name. */}
        {recipe?.name !== meal.name && <span style={{ color: "var(--color-text)", fontSize: "0.9375rem", fontWeight: 500, minWidth: 0 }}>{meal.name}</span>}
        <span style={meal.type === "eat-out" ? chipOut : chipIn}>{meal.type === "eat-out" ? "eat out" : "cook in"}</span>
      </div>

      {venue && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
          <MapPin size={12} aria-hidden="true" />
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}>
            {venue.name}
            <span className="sr-only"> (opens map in new tab)</span>
          </a>
          {venue.priceRange && <span>· {venue.priceRange}</span>}
          <VerifiedBadge verification={venue.verification} compact />
        </div>
      )}

      {meal.note && <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: "0.125rem 0 0.25rem", lineHeight: 1.5 }}>{meal.note}</p>}

      {alternatives.length > 0 && (
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)", margin: "0.125rem 0 0.25rem" }}>
          Also good: {alternatives.map((r) => r.name).join(" · ")}
        </p>
      )}

      {meal.warnings?.map((w) => (
        <p key={w} role="note" style={warningStyle}>
          <AlertTriangle size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          {w}
        </p>
      ))}

      {recipe && <div style={{ marginTop: "0.375rem" }}><RecipeCard recipe={recipe} /></div>}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-faint)", minWidth: "4.75rem" };
const chipBase: React.CSSProperties = { fontSize: "0.6875rem", padding: "0.0625rem 0.5rem", borderRadius: "var(--radius-chip)", fontWeight: 600, whiteSpace: "nowrap" };
const chipOut: React.CSSProperties = { ...chipBase, background: "var(--color-light-bronze-100)", color: "var(--color-light-bronze-700)" };
const chipIn: React.CSSProperties = { ...chipBase, background: "var(--color-bg-selected)", color: "var(--color-text-muted)" };
export const warningStyle: React.CSSProperties = {
  display: "flex", gap: "0.375rem", alignItems: "flex-start", fontSize: "0.8125rem", lineHeight: 1.45,
  color: "var(--color-warning-text)", background: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)",
  borderRadius: "8px", padding: "0.375rem 0.625rem", margin: "0.25rem 0",
};
