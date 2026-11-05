"use client";
import { ChefHat, Users, Utensils } from "lucide-react";
import type { GeneratedTrip } from "@/types/trip";
import { dayChip, SLOTS } from "@/lib/trip-view";
import MealRow from "./MealRow";
import { useTripUI } from "./TripContext";
import { card, ghostButton, muted } from "./ui";
import s from "./trip.module.css";

interface Props { trip: GeneratedTrip }

/** Every meal of the trip, day by day — cooked at the house or out. */
export default function MealPlanSection({ trip }: Props) {
  const { go } = useTripUI();
  const restaurants = new Map(trip.restaurants.map((r) => [r.id, r]));
  const meals = trip.itinerary.flatMap((d) => SLOTS.map((sl) => d.meals?.[sl]).filter(Boolean));
  const cookIns = meals.filter((m) => m!.type === "cook-in").length;
  const people = trip.meta.group.totalPeople;

  return (
    <div>
      <div className={s.statGrid} style={{ marginBottom: "1.25rem" }}>
        <Tile icon={<ChefHat size={16} />} value={`${cookIns}`} label="cooked at the house" />
        <Tile icon={<Utensils size={16} />} value={`${meals.length - cookIns}`} label="meals out" />
        <Tile icon={<Users size={16} />} value={`${people}`} label={`servings per recipe`} />
        <Tile icon={<span aria-hidden="true">📖</span>} value={`${trip.recipes.length}`} label="recipes" />
      </div>
      <p style={{ ...muted, marginBottom: "1.25rem" }}>Every recipe is scaled in code for {people} {people === 1 ? "person" : "people"}. Tap one to open it.</p>
      {trip.itinerary.map((day) => {
        const c = dayChip(day);
        return (
          <section key={day.day} style={{ ...card, padding: "1rem 1.125rem 0.25rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--color-heading)", fontSize: "1.125rem", margin: 0 }}>
                Day {day.day}{c.weekday ? ` · ${c.weekday}, ${c.date}` : c.date ? ` · ${c.date}` : ""}
              </h3>
              <button type="button" onClick={() => go({ tab: "days", day: day.day })} style={{ ...ghostButton, minHeight: 36, border: "none", padding: "0 0.25rem", fontSize: "0.8125rem" }}>
                See day →
              </button>
            </div>
            {SLOTS.map((slot) =>
              day.meals?.[slot] ? (
                <MealRow
                  key={slot}
                  label={slot.charAt(0).toUpperCase() + slot.slice(1)}
                  meal={day.meals[slot]}
                  recipes={trip.recipes}
                  restaurants={restaurants}
                />
              ) : null
            )}
          </section>
        );
      })}
    </div>
  );
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ ...card, padding: "0.75rem 0.875rem", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
      <span style={{ color: "var(--color-brand)", display: "flex" }}>{icon}</span>
      <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{label}</span>
    </div>
  );
}
