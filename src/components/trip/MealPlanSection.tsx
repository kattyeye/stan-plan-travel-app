import type { GeneratedTrip } from "@/types/trip";
import { shortDate } from "@/lib/pipeline/days";
import MealRow from "./MealRow";

interface Props { trip: GeneratedTrip }

export default function MealPlanSection({ trip }: Props) {
  const restaurants = new Map(trip.restaurants.map((r) => [r.id, r]));
  const cookIns = trip.itinerary.flatMap((d) => [d.meals.breakfast, d.meals.lunch, d.meals.dinner]).filter((m) => m.type === "cook-in").length;
  const total = trip.itinerary.length * 3;
  const people = trip.meta.group.totalPeople;

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", marginBottom: "0.375rem" }}>Meal Plan</h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        {cookIns} of {total} meals cooked at the house · every recipe scaled for {people} {people === 1 ? "person" : "people"}. Tap a recipe to open it.
      </p>
      {trip.itinerary.map((day) => (
        <section key={day.day} style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--color-heading)", fontSize: "1.125rem", marginBottom: "0.625rem" }}>
            Day {day.day} · {shortDate(day.date)}
          </h3>
          <MealRow label="Breakfast" meal={day.meals.breakfast} recipes={trip.recipes} restaurants={restaurants} />
          <MealRow label="Lunch" meal={day.meals.lunch} recipes={trip.recipes} restaurants={restaurants} />
          <MealRow label="Dinner" meal={day.meals.dinner} recipes={trip.recipes} restaurants={restaurants} />
        </section>
      ))}
    </div>
  );
}
