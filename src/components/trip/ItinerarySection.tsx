import { GeneratedTrip, ItineraryDay, Meal } from "@/types/trip";
import RecipeCard from "./RecipeCard";

interface Props { trip: GeneratedTrip }

function MealRow({ meal, label, recipes }: { meal: Meal; label: string; recipes: GeneratedTrip["recipes"] }) {
  const recipe = meal.recipeId ? recipes.find((r) => r.id === meal.recipeId) : null;
  return (
    <div style={{ marginBottom: "0.875rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem", flexWrap: "nowrap", minWidth: 0 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", flexShrink: 0 }}>{label}</span>
        <span style={{ color: "var(--color-text)", fontSize: "0.9375rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{meal.name}</span>
        {meal.type === "eat-out" && (
          <span style={{ fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "999px", background: "var(--color-light-bronze-100)", color: "var(--color-light-bronze-700)", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>eat out</span>
        )}
      </div>
      {recipe && <RecipeCard recipe={recipe} />}
    </div>
  );
}

function DayCard({ day, recipes }: { day: ItineraryDay; recipes: GeneratedTrip["recipes"] }) {
  return (
    <div style={{
      background: "var(--color-bg-card)",
      border: "1px solid var(--color-border)",
      borderRadius: "14px",
      padding: "1.5rem",
      marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.375rem", color: "var(--color-heading)", fontWeight: 400 }}>Day {day.day}</span>
        <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", fontWeight: 500 }}>{day.date}</span>
        {day.theme && <span style={{ color: "var(--color-accent)", fontSize: "0.875rem", fontStyle: "italic" }}>— {day.theme}</span>}
      </div>

      {/* Activities */}
      {day.activities.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "0.5rem" }}>Activities</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {day.activities.map((a, i) => (
              <li key={i} style={{ fontSize: "0.9375rem", color: "var(--color-text)", paddingLeft: "1rem", position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "var(--color-text-faint)" }}>·</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meals */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "0.75rem" }}>Meals</p>
        {day.meals.breakfast && <MealRow meal={day.meals.breakfast} label="Breakfast" recipes={recipes} />}
        {day.meals.lunch && <MealRow meal={day.meals.lunch} label="Lunch" recipes={recipes} />}
        {day.meals.dinner && <MealRow meal={day.meals.dinner} label="Dinner" recipes={recipes} />}
      </div>
    </div>
  );
}

export default function ItinerarySection({ trip }: Props) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", marginBottom: "1.5rem" }}>
        Daily Itinerary
      </h2>
      {trip.itinerary.map((day) => (
        <DayCard key={day.day} day={day} recipes={trip.recipes} />
      ))}
    </div>
  );
}
