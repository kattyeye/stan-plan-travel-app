"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import PlacesAutocomplete from "@/components/wizard/ui/PlacesAutocomplete";
import { setDestination, useDestination } from "./destinationStore";

const GROUPS = [
  { id: "friends", label: "Friends trip", adults: 4, kids: 0 },
  { id: "couple", label: "Couple", adults: 2, kids: 0 },
  { id: "family", label: "Family", adults: 2, kids: 2 },
  { id: "solo", label: "Solo", adults: 1, kids: 0 },
] as const;

// Same spelling as the wizard's meal step, so the choices carry over selected.
const DIETS = ["Vegetarian", "Vegan", "Gluten-free", "Nut allergy"];

/** A real shortcut into the wizard: pick the basics here, finish there. */
export default function QuickStartCard() {
  const router = useRouter();
  const destination = useDestination();
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"] | null>(null);
  const [diets, setDiets] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");

  const toggleDiet = (d: string) => setDiets((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));

  function addCustom() {
    const v = custom.trim().slice(0, 40);
    if (v && !diets.some((d) => d.toLowerCase() === v.toLowerCase())) setDiets((xs) => [...xs, v]);
    setCustom("");
    setAdding(false);
  }

  function go(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("destination", destination.trim());
    const g = GROUPS.find((x) => x.id === group);
    if (g) {
      params.set("adults", String(g.adults));
      params.set("children", String(g.kids));
    }
    diets.forEach((d) => params.append("diet", d));
    router.push(`/wizard${params.size ? `?${params}` : ""}`);
  }

  const chip = (selected: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: "0.375rem", minHeight: 40,
    padding: "0.5rem 1rem", borderRadius: "var(--radius-chip)", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
    background: selected ? "var(--color-brand)" : "var(--color-bg-selected)",
    color: selected ? "var(--color-text-inverse)" : "var(--color-text-muted)",
    border: selected ? "1px solid var(--color-brand)" : "1px solid var(--color-border)",
    transition: "background 0.12s, color 0.12s",
  });
  const label: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.625rem" };

  return (
    <form
      onSubmit={go}
      aria-labelledby="quickstart-title"
      style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "20px", padding: "1.75rem", boxShadow: "var(--shadow-float)" }}
    >
      <p style={{ ...label, marginBottom: "0.375rem" }}>Quick start</p>
      <h2 id="quickstart-title" style={{ fontFamily: "var(--font-display)", fontSize: "1.375rem", color: "var(--color-heading)", margin: "0 0 0.25rem", fontWeight: 400 }}>
        Tell us the basics
      </h2>
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: "0 0 1.25rem" }}>
        We&apos;ll carry these into the planner — dates and vibe come next.
      </p>

      <p style={label}>Where to?</p>
      <div style={{ marginBottom: "1.25rem" }}>
        <PlacesAutocomplete ariaLabel="Destination" placeholder="Search a town, island or region" value={destination} onChange={setDestination} />
      </div>

      <p id="qs-group" style={label}>Who&apos;s going?</p>
      <div role="radiogroup" aria-labelledby="qs-group" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {GROUPS.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={group === g.id} onClick={() => setGroup(group === g.id ? null : g.id)} style={chip(group === g.id)}>
            {group === g.id && <Check size={14} aria-hidden="true" />}
            {g.label}
          </button>
        ))}
      </div>

      <p id="qs-diet" style={label}>Dietary needs</p>
      <div role="group" aria-labelledby="qs-diet" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        {[...DIETS, ...diets.filter((d) => !DIETS.includes(d))].map((d) => {
          const on = diets.includes(d);
          return (
            <button key={d} type="button" aria-pressed={on} onClick={() => toggleDiet(d)} style={chip(on)}>
              {on && <Check size={14} aria-hidden="true" />}
              {d}
              {on && !DIETS.includes(d) && <X size={13} aria-hidden="true" />}
            </button>
          );
        })}
        {adding ? (
          <input
            autoFocus
            aria-label="Add a dietary need"
            value={custom}
            maxLength={40}
            placeholder="e.g. Shellfish allergy"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              } else if (e.key === "Escape") {
                setAdding(false);
              }
            }}
            onBlur={addCustom}
            style={{ minHeight: 40, padding: "0.5rem 0.875rem", borderRadius: "var(--radius-chip)", border: "1px solid var(--color-border-focus)", background: "var(--color-bg-input)", color: "var(--color-text)", fontSize: "0.875rem", width: 190 }}
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ ...chip(false), borderStyle: "dashed" }}>
            <Plus size={14} aria-hidden="true" /> Add
          </button>
        )}
      </div>

      <button
        type="submit"
        style={{ display: "block", width: "100%", marginTop: "1.5rem", minHeight: 48, padding: "0.75rem", border: "none", cursor: "pointer", background: "var(--color-brand)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-chip)", fontWeight: 600, fontSize: "0.9375rem" }}
      >
        Continue in the planner →
      </button>
    </form>
  );
}
