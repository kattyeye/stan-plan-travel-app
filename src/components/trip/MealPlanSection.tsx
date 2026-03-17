import { GeneratedTrip } from "@/types/trip";
import RecipeCard from "./RecipeCard";

interface Props { trip: GeneratedTrip }

export default function MealPlanSection({ trip }: Props) {
  const cookInRecipes = trip.recipes;

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-tea-green-950)", marginBottom: "0.5rem" }}>
        Meal Plan
      </h2>
      <p style={{ color: "var(--color-tea-green-700)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        All recipes scaled to your group. Tap any card to expand.
      </p>

      {/* Overview by day */}
      {trip.itinerary.map((day) => (
        <div key={day.day} style={{ marginBottom: "1.75rem" }}>
          <h3 style={{ fontWeight: 600, color: "var(--color-tea-green-800)", fontSize: "1rem", marginBottom: "0.75rem" }}>
            Day {day.day} — {day.date}
          </h3>
          {(["breakfast", "lunch", "dinner"] as const).map((mealType) => {
            const meal = day.meals[mealType];
            const recipe = meal.recipeId ? cookInRecipes.find((r) => r.id === meal.recipeId) : null;
            return (
              <div key={mealType} style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-tea-green-500)", minWidth: "5rem" }}>
                    {mealType}
                  </span>
                  <span style={{ color: "var(--color-tea-green-800)", fontWeight: 500 }}>{meal.name}</span>
                  {meal.type === "eat-out" && (
                    <span style={{ fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "999px", background: "var(--color-light-bronze-100)", color: "var(--color-light-bronze-700)", fontWeight: 600 }}>
                      eat out
                    </span>
                  )}
                </div>
                {recipe && <RecipeCard recipe={recipe} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
