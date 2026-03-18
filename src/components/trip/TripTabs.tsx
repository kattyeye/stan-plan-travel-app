"use client";
import { useState } from "react";
import { GeneratedTrip } from "@/types/trip";
import ItinerarySection from "./ItinerarySection";
import MealPlanSection from "./MealPlanSection";
import GrocerySection from "./GrocerySection";
import RestaurantSection from "./RestaurantSection";
import TipsSection from "./TipsSection";
import PackingSection from "./PackingSection";
import { CalendarDays, Utensils, ShoppingCart, MapPin, Compass, Luggage } from "lucide-react";

interface Props { trip: GeneratedTrip }

const TABS = [
  { id: "itinerary", label: "Itinerary", Icon: CalendarDays },
  { id: "meals", label: "Meals", Icon: Utensils },
  { id: "grocery", label: "Grocery", Icon: ShoppingCart },
  { id: "restaurants", label: "Restaurants", Icon: MapPin },
  { id: "tips", label: "Activities", Icon: Compass },
  { id: "packing", label: "Packing", Icon: Luggage },
] as const;

type TabId = typeof TABS[number]["id"];

export default function TripTabs({ trip }: Props) {
  const [active, setActive] = useState<TabId>("itinerary");

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight") {
      const next = TABS[(index + 1) % TABS.length];
      setActive(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    } else if (e.key === "ArrowLeft") {
      const prev = TABS[(index - 1 + TABS.length) % TABS.length];
      setActive(prev.id);
      document.getElementById(`tab-${prev.id}`)?.focus();
    } else if (e.key === "Home") {
      setActive(TABS[0].id);
      document.getElementById(`tab-${TABS[0].id}`)?.focus();
    } else if (e.key === "End") {
      setActive(TABS[TABS.length - 1].id);
      document.getElementById(`tab-${TABS[TABS.length - 1].id}`)?.focus();
    }
  }

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "60vh" }}>
      <style>{`
        .trip-tab-bar::-webkit-scrollbar { display: none; }
        .tab-label { display: inline; }
        @media print {
          .trip-tab-bar { display: none !important; }
          [role="tabpanel"] { display: block !important; }
        }
        [role="tab"]:focus-visible {
          outline: 2px solid var(--color-brand);
          outline-offset: -2px;
          border-radius: 4px;
        }
      `}</style>

      <div
        role="tablist"
        aria-label="Trip sections"
        style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
          overflowX: "auto",
          scrollbarWidth: "none",
          boxShadow: "0 1px 4px rgba(21,24,12,0.06)",
        }}
        className="trip-tab-bar"
      >
        <div style={{ display: "flex", maxWidth: "800px", margin: "0 auto", padding: "0 0.5rem" }}>
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={active === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={active === tab.id ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: "0.25rem",
                padding: "0.875rem 0.75rem 0.75rem",
                border: "none",
                borderBottom: active === tab.id ? "2.5px solid var(--color-brand)" : "2.5px solid transparent",
                background: "transparent",
                color: active === tab.id ? "var(--color-heading)" : "var(--color-text-muted)",
                fontSize: "0.6875rem",
                fontWeight: active === tab.id ? 700 : 400,
                cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.12s, border-color 0.12s",
                minWidth: "4.5rem",
                letterSpacing: active === tab.id ? "0.02em" : 0,
              }}
            >
              <tab.Icon size={17} aria-hidden="true" />
              <span className="tab-label" style={{ textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.6rem", marginTop: "0.2rem" }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.25rem" }}>
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={active !== tab.id}
          >
            {tab.id === "itinerary" && <ItinerarySection trip={trip} />}
            {tab.id === "meals" && <MealPlanSection trip={trip} />}
            {tab.id === "grocery" && <GrocerySection trip={trip} />}
            {tab.id === "restaurants" && <RestaurantSection trip={trip} />}
            {tab.id === "tips" && <TipsSection trip={trip} />}
            {tab.id === "packing" && <PackingSection trip={trip} />}
          </div>
        ))}
      </div>
    </div>
  );
}
