import { notFound } from "next/navigation";
import { SAMPLE_TRIPS } from "@/lib/sample-trips";
import TripHeader from "@/components/trip/TripHeader";
import ItinerarySection from "@/components/trip/ItinerarySection";
import PaywallGate from "@/components/trip/PaywallGate";
import { getCityPhoto } from "@/lib/unsplash";
import { CalendarDays, Utensils, ShoppingCart, MapPin, Compass, Luggage } from "lucide-react";

interface Props {
  params: Promise<{ city: string }>;
}

const CITY_LABELS: Record<string, string> = {
  santorini: "Santorini",
  tokyo: "Tokyo",
  austin: "Austin",
};

const TABS = [
  { id: "itinerary", label: "Itinerary", Icon: CalendarDays },
  { id: "meals", label: "Meals", Icon: Utensils },
  { id: "grocery", label: "Grocery", Icon: ShoppingCart },
  { id: "restaurants", label: "Restaurants", Icon: MapPin },
  { id: "tips", label: "Activities", Icon: Compass },
  { id: "packing", label: "Packing", Icon: Luggage },
];

export async function generateStaticParams() {
  return Object.keys(SAMPLE_TRIPS).map((city) => ({ city }));
}

export default async function PreviewPage({ params }: Props) {
  const { city } = await params;
  const trip = SAMPLE_TRIPS[city];
  if (!trip) notFound();

  const cityLabel = CITY_LABELS[city] ?? city;
  const cityPhoto = await getCityPhoto(trip.meta.destination);

  // Only show Day 1 — the rest is behind the paywall
  const previewTrip = {
    ...trip,
    itinerary: trip.itinerary.slice(0, 1),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TripHeader trip={trip} cityPhoto={cityPhoto} preview />

      {/* Tab bar — all locked except Itinerary */}
      <div style={{
        position: "sticky", top: 60, zIndex: 10,
        background: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "0 1px 4px rgba(21,24,12,0.06)",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        <div style={{ display: "flex", maxWidth: "800px", margin: "0 auto", padding: "0 0.5rem" }}>
          {TABS.map((tab) => {
            const isActive = tab.id === "itinerary";
            const isLocked = tab.id !== "itinerary";
            return (
              <div
                key={tab.id}
                style={{
                  flex: 1,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: "0.25rem",
                  padding: "0.875rem 0.75rem 0.75rem",
                  borderBottom: isActive ? "2.5px solid var(--color-brand)" : "2.5px solid transparent",
                  color: isActive ? "var(--color-heading)" : "var(--color-text-faint)",
                  fontSize: "0.6875rem",
                  fontWeight: isActive ? 700 : 400,
                  whiteSpace: "nowrap",
                  minWidth: "4.5rem",
                  position: "relative",
                  opacity: isLocked ? 0.45 : 1,
                  cursor: isLocked ? "default" : "pointer",
                }}
              >
                <tab.Icon size={17} aria-hidden="true" />
                <span style={{ textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "0.6rem", marginTop: "0.2rem" }}>
                  {tab.label}
                </span>
                {isLocked && (
                  <span style={{
                    position: "absolute", top: 6, right: 6,
                    fontSize: "0.5rem", lineHeight: 1,
                    color: "var(--color-text-faint)",
                  }}>🔒</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview content */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.25rem 0" }}>
        {/* "Sample plan" banner */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          background: "rgba(204, 204, 221, 0.15)",
          border: "1px solid var(--color-accent, #CCCCDD)",
          borderRadius: "10px",
          marginBottom: "1.75rem",
        }}>
          <span style={{ fontSize: "1rem" }}>✦</span>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
            <strong style={{ color: "var(--color-text)" }}>Sample plan</strong> — this is a real Irie-generated itinerary for {cityLabel}.
            Build your own personalized version in 2 minutes.
          </p>
        </div>

        {/* Day 1 itinerary — fully visible */}
        <ItinerarySection trip={previewTrip} />
      </div>

      {/* Paywall gate */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 1.25rem 5rem", position: "relative" }}>
        <PaywallGate destination={cityLabel} />
      </div>
    </div>
  );
}
