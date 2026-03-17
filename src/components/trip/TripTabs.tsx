"use client";
import { useState } from "react";
import { GeneratedTrip } from "@/types/trip";
import ItinerarySection from "./ItinerarySection";
import MealPlanSection from "./MealPlanSection";
import GrocerySection from "./GrocerySection";
import RestaurantSection from "./RestaurantSection";
import TipsSection from "./TipsSection";
import PackingSection from "./PackingSection";

interface Props { trip: GeneratedTrip }

const TABS = [
  { id: "itinerary", label: "Itinerary", emoji: "📅" },
  { id: "meals", label: "Meals", emoji: "🍴" },
  { id: "grocery", label: "Grocery", emoji: "🛒" },
  { id: "restaurants", label: "Restaurants", emoji: "🍜" },
  { id: "tips", label: "Tips", emoji: "🎯" },
  { id: "packing", label: "Packing", emoji: "🧳" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function TripTabs({ trip }: Props) {
  const [active, setActive] = useState<TabId>("itinerary");

  return (
    <div style={{ background: "var(--color-tea-green-50)", minHeight: "60vh" }}>
      {/* Tab bar */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--color-cornsilk-50)",
        borderBottom: "1px solid var(--color-tea-green-200)",
        overflowX: "auto",
      }}>
        <div style={{ display: "flex", maxWidth: "800px", margin: "0 auto", padding: "0 1rem" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.875rem 1rem",
                border: "none",
                borderBottom: active === tab.id ? "2px solid var(--color-tea-green-600)" : "2px solid transparent",
                background: "transparent",
                color: active === tab.id ? "var(--color-tea-green-800)" : "var(--color-tea-green-600)",
                fontSize: "0.875rem",
                fontWeight: active === tab.id ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.12s",
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
        {active === "itinerary" && <ItinerarySection trip={trip} />}
        {active === "meals" && <MealPlanSection trip={trip} />}
        {active === "grocery" && <GrocerySection trip={trip} />}
        {active === "restaurants" && <RestaurantSection trip={trip} />}
        {active === "tips" && <TipsSection trip={trip} />}
        {active === "packing" && <PackingSection trip={trip} />}
      </div>
    </div>
  );
}
