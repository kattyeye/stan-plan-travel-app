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
  { id: "tips", label: "Activities", emoji: "🎯" },
  { id: "packing", label: "Packing", emoji: "🧳" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function TripTabs({ trip }: Props) {
  const [active, setActive] = useState<TabId>("itinerary");

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "60vh" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
        overflowX: "auto",
      }} className="trip-tab-bar">
        <div style={{ display: "flex", maxWidth: "800px", margin: "0 auto", padding: "0 1rem" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                padding: "0.875rem 1rem",
                border: "none",
                borderBottom: active === tab.id ? "2px solid var(--color-brand)" : "2px solid transparent",
                background: "transparent",
                color: active === tab.id ? "var(--color-text)" : "var(--color-text-muted)",
                fontSize: "0.875rem",
                fontWeight: active === tab.id ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.12s",
              }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
        <style>{`
          .trip-section { display: none; }
          .trip-section.active { display: block; }
          @media print {
            .trip-section { display: block !important; }
            .trip-tab-bar { display: none !important; }
          }
        `}</style>
        <div className={`trip-section${active === "itinerary" ? " active" : ""}`}><ItinerarySection trip={trip} /></div>
        <div className={`trip-section${active === "meals" ? " active" : ""}`}><MealPlanSection trip={trip} /></div>
        <div className={`trip-section${active === "grocery" ? " active" : ""}`}><GrocerySection trip={trip} /></div>
        <div className={`trip-section${active === "restaurants" ? " active" : ""}`}><RestaurantSection trip={trip} /></div>
        <div className={`trip-section${active === "tips" ? " active" : ""}`}><TipsSection trip={trip} /></div>
        <div className={`trip-section${active === "packing" ? " active" : ""}`}><PackingSection trip={trip} /></div>
      </div>
    </div>
  );
}
