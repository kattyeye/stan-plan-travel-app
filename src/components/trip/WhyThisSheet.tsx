"use client";
import { useState } from "react";
import { Check, CheckCircle2, EyeOff, Flag, Globe, MapPin, ShieldCheck, Sparkles, User } from "lucide-react";
import type { ItineraryDay, ReportReason } from "@/types/trip";
import { BUCKET_LABEL, explainStop, type ReasonSource, type TimelineStop } from "@/lib/trip-view";
import { swapKey, swapOptions } from "@/lib/trips/edits";
import Sheet from "./Sheet";
import VerifiedBadge from "./VerifiedBadge";
import { useTripUI } from "./TripContext";
import { chip, ghostButton, muted, pillButton } from "./ui";

const SOURCE: Record<ReasonSource, { label: string; Icon: typeof MapPin }> = {
  google: { label: "Google Maps", Icon: MapPin },
  web: { label: "Web research", Icon: Globe },
  you: { label: "Your answers", Icon: User },
  checks: { label: "Irie's checks", Icon: ShieldCheck },
  ai: { label: "AI pick", Icon: Sparkles },
};

const REPORTS: { reason: ReportReason; label: string }[] = [
  { reason: "closed", label: "It's closed" },
  { reason: "wrong_hours", label: "Hours are wrong" },
  { reason: "not_a_fit", label: "Not a fit for us" },
  { reason: "other", label: "Something else" },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "Why this?" — the reasons behind a stop, each labelled with where it came
 * from, plus the controls to change it (swap to another researched place,
 * skip, mark done, report a problem).
 */
export default function WhyThisSheet({ stop, day, open, onClose }: { stop: TimelineStop; day: ItineraryDay; open: boolean; onClose: () => void }) {
  const { trip, original, edits, preview } = useTripUI();
  const [reporting, setReporting] = useState(false);
  const reasons = explainStop(stop, day, trip);
  const swapped = stop.slot ? edits?.edits.mealSwaps[swapKey(day.day, stop.slot)] : undefined;
  const options = stop.slot && stop.meal?.type === "eat-out" ? swapOptions(original, day.day, stop.slot) : [];
  const currentId = stop.meal?.restaurantId;
  const can = !!edits?.canEdit && !preview;

  const when = [stop.slot ? cap(stop.slot) : null, stop.time ?? (stop.bucket !== "anytime" ? BUCKET_LABEL[stop.bucket] : null)].filter(Boolean).join(" · ");

  return (
    <Sheet open={open} onClose={onClose} title={stop.place?.name ?? stop.recipe?.name ?? stop.text} subtitle={`Day ${day.day}${when ? ` · ${when}` : ""}`}>
      {swapped && (
        <p style={{ ...chip, background: "var(--color-light-bronze-100)", color: "var(--color-light-bronze-700)", marginBottom: "0.75rem", whiteSpace: "normal" }}>
          Changed by your group
        </p>
      )}

      <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text)", margin: "0 0 0.5rem" }}>Why it&apos;s on your plan</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {reasons.map((r, i) => {
          const src = SOURCE[r.source];
          return (
            <li key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.625rem", alignItems: "start" }}>
              <span title={src.label} style={{ ...chip, padding: "0.125rem 0.5rem", fontSize: "0.6875rem" }}>
                <src.Icon size={11} aria-hidden="true" />
                {src.label}
              </span>
              <span style={{ fontSize: "0.875rem", lineHeight: 1.5, color: "var(--color-text)" }}>
                {r.text}
                {r.href && (
                  <>
                    {" "}
                    <a href={r.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-brand)", fontWeight: 600 }}>
                      View<span className="sr-only"> source (opens in new tab)</span>
                    </a>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {options.length > 1 && (
        <section style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text)", margin: "0 0 0.25rem" }}>Not feeling it? Switch to another researched spot</h3>
          <p style={{ ...muted, fontSize: "0.8125rem", marginBottom: "0.5rem" }}>Only places from our research that serve {stop.slot} and aren&apos;t known to be closed on {day.weekday ?? "this day"}.</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {options.slice(0, 6).map((r) => {
              const on = r.id === currentId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={!can || on}
                    aria-pressed={on}
                    onClick={() => {
                      edits?.apply({ type: "swap_meal", day: day.day, slot: stop.slot!, restaurantId: r.id }, `Day ${day.day} ${stop.slot}: ${r.name}`);
                      onClose();
                    }}
                    style={{
                      width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: "0.625rem", textAlign: "left",
                      padding: "0.5rem 0.75rem", borderRadius: "var(--radius-input)", cursor: can && !on ? "pointer" : "default",
                      border: `1px solid ${on ? "var(--color-brand)" : "var(--color-border)"}`, background: on ? "var(--color-bg-selected)" : "var(--color-bg)", color: "var(--color-text)",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: "0.9375rem" }}>{r.name}</span>
                      <span style={{ display: "flex", gap: "0.375rem", alignItems: "center", fontSize: "0.75rem", color: "var(--color-text-muted)", flexWrap: "wrap" }}>
                        {r.priceRange} {r.tags.slice(0, 2).join(" · ")} <VerifiedBadge verification={r.verification} compact />
                      </span>
                    </span>
                    {on ? <span style={{ ...chip, background: "var(--color-brand)", color: "var(--color-text-inverse)" }}><Check size={12} aria-hidden="true" /> On plan</span> : <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-brand)" }}>Pick</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!preview && edits && (
        <section style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.875rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={!can}
              style={pillButton(!!stop.done)}
              onClick={() => {
                edits.apply({ type: stop.done ? "undone_stop" : "done_stop", day: day.day, key: stop.key }, stop.done ? "Marked not done" : "Nice! Marked as done");
                onClose();
              }}
            >
              <CheckCircle2 size={16} aria-hidden="true" /> {stop.done ? "Done ✓" : "Mark done"}
            </button>
            <button
              type="button"
              disabled={!can}
              style={ghostButton}
              onClick={() => {
                edits.apply({ type: stop.hidden ? "unhide_stop" : "hide_stop", day: day.day, key: stop.key }, stop.hidden ? "Back on the plan" : "Skipped — it's hidden for everyone");
                onClose();
              }}
            >
              <EyeOff size={16} aria-hidden="true" /> {stop.hidden ? "Restore" : "Skip it"}
            </button>
            <button type="button" disabled={!can} style={ghostButton} aria-expanded={reporting} onClick={() => setReporting((v) => !v)}>
              <Flag size={16} aria-hidden="true" /> Report a problem
            </button>
          </div>
          {reporting && (
            <div role="group" aria-label="What's wrong?" style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.625rem" }}>
              {REPORTS.map((r) => (
                <button
                  key={r.reason}
                  type="button"
                  style={{ ...pillButton(false), minHeight: 40, fontSize: "0.8125rem" }}
                  onClick={() => {
                    edits.apply({ type: "report", day: day.day, venueId: stop.place?.id, reason: r.reason }, "Thanks — we've flagged it for review");
                    setReporting(false);
                    onClose();
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          {!edits.canEdit && <p style={{ ...muted, fontSize: "0.75rem", marginTop: "0.5rem" }}>You&apos;re offline — changes are paused until you reconnect.</p>}
        </section>
      )}

      <p style={{ ...muted, fontSize: "0.75rem", marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
        <ShieldCheck size={13} aria-hidden="true" /> Planned by AI from live research · dates, hours, servings and allergy checks done by code.
      </p>
    </Sheet>
  );
}
