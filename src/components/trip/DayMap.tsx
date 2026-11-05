"use client";
import { useState } from "react";
import { Map as MapIcon, Navigation, WifiOff } from "lucide-react";
import { mapsDirectionsUrl, mapsEmbedUrl, type TimelineStop } from "@/lib/trip-view";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useTripUI } from "./TripContext";
import { card, muted, pillButton } from "./ui";

/**
 * The day's route on a Google map (Maps Embed API: free, no usage limits),
 * lettered to match the timeline. Phones load it on tap; without a key or a
 * connection the "Open in Google Maps" link still works.
 */
export default function DayMap({ dayNumber, stops }: { dayNumber: number; stops: TimelineStop[] }) {
  const { trip, mapsKey, live } = useTripUI();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [openedOnPhone, setOpenedOnPhone] = useState(false);
  const mapped = stops.filter((s) => s.letter && s.place);
  const places = mapped.map((s) => s.place!);
  const destination = trip.meta.destination;
  const route = mapsDirectionsUrl(places, destination);
  const show = !!mapsKey && live.online && (desktop || openedOnPhone);

  return (
    <section aria-label={`Map for day ${dayNumber}`} style={{ ...card, padding: "0.75rem", overflow: "hidden" }}>
      {show ? (
        <iframe
          key={`${dayNumber}-${places.map((p) => p.id ?? p.name).join("|")}`}
          title={`Route for day ${dayNumber}`}
          src={mapsEmbedUrl(places, mapsKey!, destination)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          style={{ width: "100%", height: desktop ? 360 : 300, border: 0, borderRadius: "calc(var(--radius-card) - 4px)", display: "block", background: "var(--color-bg-selected)" }}
        />
      ) : mapsKey && live.online && !desktop ? (
        <button
          type="button"
          onClick={() => setOpenedOnPhone(true)}
          style={{ width: "100%", minHeight: 64, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: "calc(var(--radius-card) - 4px)", border: "1px dashed var(--color-border-focus)", background: "var(--color-bg-selected)", color: "var(--color-text)", cursor: "pointer", textAlign: "left" }}
        >
          <MapIcon size={22} aria-hidden="true" style={{ color: "var(--color-brand)" }} />
          <span>
            <span style={{ display: "block", fontWeight: 700 }}>Show route map</span>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{places.length ? `${places.length} stop${places.length === 1 ? "" : "s"} on the map` : "The area on a map"}</span>
          </span>
        </button>
      ) : (
        <p style={{ ...muted, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem" }}>
          {!live.online ? <WifiOff size={16} aria-hidden="true" /> : <MapIcon size={16} aria-hidden="true" />}
          {!live.online ? "The map needs a connection — your plan below works offline." : "Today's stops, in order:"}
        </p>
      )}

      {mapped.length > 0 && (
        <ol style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {mapped.map((s) => (
            <li key={s.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text)" }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 999, background: "var(--color-brand)", color: "var(--color-text-inverse)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.6875rem", flexShrink: 0 }}>
                {s.letter}
              </span>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span className="sr-only">Stop {s.letter}: </span>
                {s.place!.name}
              </span>
              {s.time && <span style={{ marginLeft: "auto", color: "var(--color-text-faint)", whiteSpace: "nowrap" }}>{s.time}</span>}
            </li>
          ))}
        </ol>
      )}

      {route && (
        <a href={route} target="_blank" rel="noopener noreferrer" style={{ ...pillButton(false), width: "100%", marginTop: "0.75rem", fontSize: "0.875rem" }}>
          <Navigation size={15} aria-hidden="true" /> Open {places.length > 1 ? "the day's route" : "it"} in Google Maps<span className="sr-only"> (opens in new tab)</span>
        </a>
      )}
    </section>
  );
}
