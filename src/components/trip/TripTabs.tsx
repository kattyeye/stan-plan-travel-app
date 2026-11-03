"use client";
import { useEffect, useState } from "react";
import type { GeneratedTrip } from "@/types/trip";
import ItinerarySection from "./ItinerarySection";
import MealPlanSection from "./MealPlanSection";
import GrocerySection from "./GrocerySection";
import RestaurantSection from "./RestaurantSection";
import TipsSection from "./TipsSection";
import PackingSection from "./PackingSection";
import { CalendarDays, Utensils, ShoppingCart, MapPin, Compass, Luggage } from "lucide-react";

interface Props { trip: GeneratedTrip; slug?: string }

const TABS = [
  { id: "itinerary", label: "Itinerary", Icon: CalendarDays },
  { id: "meals", label: "Meals", Icon: Utensils },
  { id: "grocery", label: "Grocery", Icon: ShoppingCart },
  { id: "restaurants", label: "Eat out", Icon: MapPin },
  { id: "tips", label: "To do", Icon: Compass },
  { id: "packing", label: "Packing", Icon: Luggage },
] as const;

type TabId = (typeof TABS)[number]["id"];
const isTab = (v: string): v is TabId => TABS.some((t) => t.id === v);

export default function TripTabs({ trip, slug }: Props) {
  const [active, setActive] = useState<TabId>("itinerary");

  // Deep links (#grocery) and the back button both work.
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      if (isTab(hash)) setActive(hash);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function select(id: TabId, focus = false) {
    setActive(id);
    history.replaceState(null, "", `#${id}`);
    if (focus) document.getElementById(`tab-${id}`)?.focus();
    const bar = document.getElementById("trip-tabs");
    if (bar && bar.getBoundingClientRect().top < 60) window.scrollTo({ top: bar.offsetTop - 60, behavior: "smooth" });
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    const map: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    select(TABS[(map[e.key] + TABS.length) % TABS.length].id, true);
  }

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "60vh" }}>
      <style>{`
        .trip-tab-bar::-webkit-scrollbar { display: none; }
        @media print {
          .trip-tab-bar, .no-print { display: none !important; }
          [role="tabpanel"] { display: block !important; }
          .recipe-body { display: block !important; }
        }
        [role="tab"]:focus-visible { outline: 2px solid var(--color-brand); outline-offset: -2px; border-radius: 4px; }
      `}</style>

      <div
        id="trip-tabs"
        role="tablist"
        aria-label="Trip sections"
        className="trip-tab-bar"
        style={{ position: "sticky", top: 60, zIndex: 10, background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)", overflowX: "auto", scrollbarWidth: "none", boxShadow: "var(--shadow-card)" }}
      >
        <div style={{ display: "flex", maxWidth: "800px", margin: "0 auto", padding: "0 0.25rem" }}>
          {TABS.map((tab, index) => {
            const selected = active === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem",
                  padding: "0.75rem 0.25rem 0.625rem", minWidth: "3.5rem", minHeight: 52, border: "none",
                  borderBottom: selected ? "2.5px solid var(--color-brand)" : "2.5px solid transparent",
                  background: "transparent", color: selected ? "var(--color-heading)" : "var(--color-text-muted)",
                  fontWeight: selected ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.12s, border-color 0.12s",
                }}
              >
                <tab.Icon size={17} aria-hidden="true" />
                <span style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.625rem" }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1.75rem 1rem 4rem" }}>
        {TABS.map((tab) => (
          <div key={tab.id} id={`panel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} hidden={active !== tab.id} tabIndex={0}>
            {tab.id === "itinerary" && <ItinerarySection trip={trip} />}
            {tab.id === "meals" && <MealPlanSection trip={trip} />}
            {tab.id === "grocery" && <GrocerySection trip={trip} slug={slug} />}
            {tab.id === "restaurants" && <RestaurantSection trip={trip} />}
            {tab.id === "tips" && <TipsSection trip={trip} />}
            {tab.id === "packing" && <PackingSection trip={trip} slug={slug} />}
          </div>
        ))}
      </div>
    </div>
  );
}
