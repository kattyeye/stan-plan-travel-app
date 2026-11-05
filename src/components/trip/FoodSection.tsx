"use client";
import type { GeneratedTrip } from "@/types/trip";
import MealPlanSection from "./MealPlanSection";
import RestaurantSection from "./RestaurantSection";
import Segmented from "./Segmented";
import { useTripUI } from "./TripContext";
import { h2 } from "./ui";

/** Food tab: the meal plan and the restaurant guide, one switch apart. */
export default function FoodSection({ trip }: { trip: GeneratedTrip }) {
  const { food, go } = useTripUI();
  return (
    <div>
      <h2 style={{ ...h2, marginBottom: "0.875rem" }}>{food === "plan" ? "Meal plan" : "Where to eat & drink"}</h2>
      <div style={{ marginBottom: "1.25rem" }}>
        <Segmented
          label="Food view"
          value={food}
          onChange={(v) => go({ tab: "food", food: v })}
          options={[
            { value: "plan", label: "Meal plan", meta: `${trip.recipes.length} recipes` },
            { value: "eat", label: "Places to eat", meta: `${trip.restaurants.length}` },
          ]}
        />
      </div>
      {/* Both views stay in the page so printing includes everything. */}
      <div hidden={food !== "plan"} className="print-show"><MealPlanSection trip={trip} /></div>
      <div hidden={food !== "eat"} className="print-show"><RestaurantSection trip={trip} /></div>
    </div>
  );
}
