"use client";
import { useState } from "react";
import { CalendarPlus, Download, Printer, Check } from "lucide-react";
import { NormalizedTrip } from "@/types/trip";
import { buildTripEvents } from "@/core/calendar";

interface Props {
  trip: NormalizedTrip;
  slug: string;
}

type Scope = "all" | "activities" | "meals";

const SCOPES: { id: Scope; label: string; hint: string }[] = [
  { id: "all", label: "Everything", hint: "Activities and meals" },
  { id: "activities", label: "Activities only", hint: "Skip the meal plan" },
  { id: "meals", label: "Meals only", hint: "Reservations and cook-in times" },
];

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.45rem",
  padding: "0.5rem 0.9rem",
  borderRadius: "var(--radius-input)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-card)",
  color: "var(--color-text)",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

export default function TripActions({ trip, slug }: Props) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  // Counts come from the same builder the server uses, so the labels can't
  // disagree with what actually lands in the calendar.
  const counts = {
    all: buildTripEvents(trip, { tripId: slug }).length,
    activities: buildTripEvents(trip, { tripId: slug, meals: false }).length,
    meals: buildTripEvents(trip, { tripId: slug, activities: false }).length,
  };

  function noteDownloadStarted() {
    setOpen(false);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="no-print" style={{ marginBottom: "1.5rem", position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          style={{
            ...buttonStyle,
            background: "var(--color-brand)",
            borderColor: "var(--color-brand)",
            color: "var(--color-text-inverse)",
          }}
        >
          {added ? <Check size={15} aria-hidden="true" /> : <CalendarPlus size={15} aria-hidden="true" />}
          {added ? "Calendar file ready" : "Add to calendar"}
        </button>

        <a href={`/api/v1/trips/${slug}/download`} style={{ ...buttonStyle, textDecoration: "none" }}>
          <Download size={15} aria-hidden="true" />
          Download
        </a>

        <button type="button" onClick={() => window.print()} style={buttonStyle}>
          <Printer size={15} aria-hidden="true" />
          Print
        </button>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Choose what to add to your calendar"
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            left: 0,
            zIndex: 20,
            minWidth: "16rem",
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-float)",
            padding: "0.375rem",
          }}
        >
          {SCOPES.map((scope) => (
            <a
              key={scope.id}
              role="menuitem"
              href={`/api/v1/trips/${slug}/calendar.ics?include=${scope.id}`}
              onClick={noteDownloadStarted}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                background: "transparent",
                textDecoration: "none",
                color: "var(--color-text)",
              }}
            >
              <span style={{ display: "block", fontWeight: 600, fontSize: "0.875rem" }}>
                {scope.label}
                <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>
                  {" "}· {counts[scope.id]} event{counts[scope.id] === 1 ? "" : "s"}
                </span>
              </span>
              <span style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                {scope.hint}
              </span>
            </a>
          ))}
          <p style={{ margin: 0, padding: "0.5rem 0.75rem 0.375rem", fontSize: "0.75rem", color: "var(--color-text-faint)", lineHeight: 1.5 }}>
            Opens in Apple Calendar, Google Calendar or Outlook. Times are local
            to your destination.
          </p>
        </div>
      )}
    </div>
  );
}
