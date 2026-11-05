"use client";
import { useEffect, useState } from "react";
import type { TripMeta } from "@/types/trip";
import { localISODate, phaseLabel, tripPhase } from "@/lib/trip-view";

/** "12 days to go" / "Day 3 of 6 · today" / "Hope it was irie" — computed on the viewer's clock after mount. */
export default function PhasePill({ dates }: { dates: TripMeta["dates"] }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on the viewer's clock, so only after mount
    setLabel(phaseLabel(tripPhase(dates, localISODate(new Date()))));
  }, [dates]);
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.3125rem 0.75rem", borderRadius: "var(--radius-chip)",
        // Sits on the header, which is dark in both themes, so use the constant raw palette tone.
        background: "var(--color-cornsilk-300)", color: "var(--color-tea-green-950)", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.01em",
      }}
    >
      <span aria-hidden="true">✦</span>
      {label}
    </span>
  );
}
