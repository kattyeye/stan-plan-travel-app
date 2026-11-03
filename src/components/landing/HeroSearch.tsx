"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import PlacesAutocomplete from "@/components/wizard/ui/PlacesAutocomplete";
import { setDestination, useDestination } from "./destinationStore";

const SIZES = [
  { value: "", label: "Group size" },
  { value: "1", label: "Solo" },
  { value: "2", label: "2 people" },
  { value: "4", label: "3–5 people" },
  { value: "6", label: "6+ people" },
];

/** Landing-page search: destination (with suggestions) + group size → prefilled wizard. */
export default function HeroSearch() {
  const router = useRouter();
  const destination = useDestination();
  const [adults, setAdults] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("destination", destination.trim());
    if (adults) params.set("adults", adults);
    router.push(`/wizard${params.size ? `?${params}` : ""}`);
  }

  return (
    <form onSubmit={submit} role="search" aria-label="Start planning a trip" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
        <PlacesAutocomplete
          ariaLabel="Destination"
          placeholder="Where to?"
          value={destination}
          onChange={setDestination}
          inputStyle={{ padding: "0.75rem 2.5rem 0.75rem 1rem", minHeight: 48 }}
        />
      </div>
      <select
        aria-label="Group size"
        value={adults}
        onChange={(e) => setAdults(e.target.value)}
        style={{
          flex: "0 1 150px",
          padding: "0.75rem 1rem",
          minHeight: 48,
          background: "var(--color-bg-input)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-input)",
          fontSize: "0.9375rem",
          color: adults ? "var(--color-text)" : "var(--color-text-muted)",
          cursor: "pointer",
        }}
      >
        {SIZES.map((s) => (
          <option key={s.value} value={s.value} disabled={!s.value}>{s.label}</option>
        ))}
      </select>
      <button
        type="submit"
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem", minHeight: 48,
          padding: "0.75rem 1.5rem", border: "none", cursor: "pointer",
          background: "var(--color-brand)", color: "var(--color-text-inverse)",
          borderRadius: "var(--radius-chip)", fontWeight: 600, fontSize: "0.9375rem", whiteSpace: "nowrap",
        }}
      >
        Build My Itinerary →
      </button>
    </form>
  );
}
