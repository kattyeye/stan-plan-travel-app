import { AlertTriangle } from "lucide-react";
import type { GeneratedTrip, ItineraryDay, Restaurant } from "@/types/trip";
import { shortDate } from "@/lib/pipeline/days";
import MealRow, { warningStyle } from "./MealRow";

interface Props { trip: GeneratedTrip }

const TIME_PREFIX = /^\s*((?:\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)|morning|midday|afternoon|evening|night|late night)\s*[—–-]\s*/i;

function ScheduleLine({ line }: { line: string }) {
  const m = line.match(TIME_PREFIX);
  if (!m) return <>{line}</>;
  return (
    <>
      <span style={{ fontWeight: 600, color: "var(--color-brand)", marginRight: "0.375rem", whiteSpace: "nowrap" }}>{m[1]}</span>
      {line.slice(m[0].length)}
    </>
  );
}

function DayCard({ day, trip, restaurants }: { day: ItineraryDay; trip: GeneratedTrip; restaurants: Map<string, Restaurant> }) {
  return (
    <article
      aria-labelledby={`day-${day.day}`}
      style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "1.25rem 1.25rem 0.5rem", marginBottom: "1.25rem", boxShadow: "var(--shadow-card)" }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: "0.625rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <h3 id={`day-${day.day}`} style={{ fontFamily: "var(--font-display)", fontSize: "1.375rem", color: "var(--color-heading)", fontWeight: 400, margin: 0 }}>
          Day {day.day}
        </h3>
        <span style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", fontWeight: 500 }}>{shortDate(day.date)}</span>
        {day.theme && <span style={{ color: "var(--color-accent)", fontSize: "0.875rem", fontStyle: "italic" }}>— {day.theme}</span>}
      </header>

      {day.warnings?.map((w) => (
        <p key={w} role="note" style={warningStyle}><AlertTriangle size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />{w}</p>
      ))}

      {day.activities.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.125rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {day.activities.map((a, i) => (
            <li key={i} style={{ fontSize: "0.9375rem", color: "var(--color-text)", lineHeight: 1.5, paddingLeft: "0.875rem", borderLeft: "2px solid var(--color-border)" }}>
              <ScheduleLine line={a} />
            </li>
          ))}
        </ul>
      )}

      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.875rem" }}>
        <MealRow label="Breakfast" meal={day.meals.breakfast} recipes={trip.recipes} restaurants={restaurants} />
        <MealRow label="Lunch" meal={day.meals.lunch} recipes={trip.recipes} restaurants={restaurants} />
        <MealRow label="Dinner" meal={day.meals.dinner} recipes={trip.recipes} restaurants={restaurants} />
      </div>
    </article>
  );
}

export default function ItinerarySection({ trip }: Props) {
  const restaurants = new Map(trip.restaurants.map((r) => [r.id, r]));
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", marginBottom: "1.25rem" }}>Daily Itinerary</h2>
      {trip.itinerary.map((day) => (
        <DayCard key={day.day} day={day} trip={trip} restaurants={restaurants} />
      ))}
    </div>
  );
}
