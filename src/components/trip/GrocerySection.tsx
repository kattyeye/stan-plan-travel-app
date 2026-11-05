"use client";
import { useCallback, useMemo, useState } from "react";
import type { AggregatedIngredient, GeneratedTrip, RecipeIngredient } from "@/types/trip";
import { useStoredChecklist } from "@/hooks/useStoredChecklist";
import { groceryMaster, groceryStorageKey } from "./checklists";
import VerifiedBadge from "./VerifiedBadge";

interface Props { trip: GeneratedTrip; slug?: string }

const CATEGORY: Record<string, { emoji: string; label: string }> = {
  produce: { emoji: "🥦", label: "Produce" }, meat: { emoji: "🥩", label: "Meat" }, seafood: { emoji: "🐟", label: "Seafood" },
  dairy: { emoji: "🧀", label: "Dairy & eggs" }, bakery: { emoji: "🍞", label: "Bakery" }, frozen: { emoji: "🧊", label: "Frozen" },
  pantry: { emoji: "🫙", label: "Pantry" }, drinks: { emoji: "🧃", label: "Drinks" }, supplies: { emoji: "🧻", label: "Supplies" },
};

function IngredientRow({ ing }: { ing: RecipeIngredient }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0.375rem 0", borderBottom: "1px solid var(--color-border)", fontSize: "0.875rem" }}>
      <span style={{ color: "var(--color-text)" }}>{ing.item}</span>
      <span style={{ color: "var(--color-text-muted)", fontWeight: 500, marginLeft: "1rem", whiteSpace: "nowrap" }}>{ing.amount} {ing.unit}</span>
    </div>
  );
}

export default function GrocerySection({ trip, slug }: Props) {
  const [view, setView] = useState<"master" | "by-meal">("master");
  const { groceryList } = trip;

  const master: AggregatedIngredient[] = useMemo(() => groceryMaster(trip), [trip]);
  const byCategory = useMemo(() => {
    const out = new Map<string, AggregatedIngredient[]>();
    for (const m of master) out.set(m.category, [...(out.get(m.category) ?? []), m]);
    return out;
  }, [master]);

  const initial = useCallback(() => ({}) as Record<string, boolean>, []);
  const { checked, toggle, reset } = useStoredChecklist(groceryStorageKey(slug, trip), initial);
  const done = master.filter((m) => checked[m.item]).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", margin: 0 }}>Grocery List</h2>
          {view === "master" && <p aria-live="polite" style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{done} of {master.length} in the cart</p>}
        </div>
        <div role="group" aria-label="Grocery list view" style={{ display: "flex", gap: "0.25rem", background: "var(--color-bg-selected)", borderRadius: "8px", padding: "0.25rem" }}>
          {(["master", "by-meal"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              style={{ padding: "0.375rem 0.75rem", borderRadius: "6px", border: "none", background: view === v ? "var(--color-bg-card)" : "transparent", color: view === v ? "var(--color-text)" : "var(--color-text-muted)", fontSize: "0.875rem", fontWeight: view === v ? 600 : 400, cursor: "pointer", boxShadow: view === v ? "var(--shadow-card)" : "none" }}
            >
              {v === "master" ? "Shopping list" : "By recipe"}
            </button>
          ))}
        </div>
      </div>

      {groceryList.shoppingNote && (
        <p style={{ padding: "0.75rem 1rem", background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "8px", color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
          💡 {groceryList.shoppingNote}
        </p>
      )}

      {view === "master" ? (
        <div>
          {[...byCategory.entries()].map(([cat, items]) => (
            <section key={cat} style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", margin: "0 0 0.375rem" }}>
                <span aria-hidden="true">{CATEGORY[cat]?.emoji ?? "🛒"} </span>{CATEGORY[cat]?.label ?? cat}
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "10px", overflow: "hidden" }}>
                {items.map((m, i) => {
                  const isChecked = !!checked[m.item];
                  return (
                    <li key={m.item} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 1rem", cursor: "pointer", minHeight: 44 }}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggle(m.item)} style={{ width: "1.125rem", height: "1.125rem", accentColor: "var(--color-brand)", flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: "0.9375rem", color: isChecked ? "var(--color-text-faint)" : "var(--color-text)", textDecoration: isChecked ? "line-through" : "none" }}>{m.item}</span>
                        <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{m.quantity}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {done > 0 && (
            <button type="button" onClick={reset} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-muted)", fontSize: "0.875rem", cursor: "pointer" }}>
              Clear checkmarks
            </button>
          )}
        </div>
      ) : (
        <div>
          {groceryList.byMeal.map((m, i) => (
            <section key={i} style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
                Day {m.day} · {m.mealType.charAt(0).toUpperCase() + m.mealType.slice(1)} — {m.mealName}
              </h3>
              {m.ingredients.map((ing, j) => <IngredientRow key={j} ing={ing} />)}
            </section>
          ))}
          {groceryList.staples.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>Staples &amp; extras</h3>
              {groceryList.staples.map((ing, j) => <IngredientRow key={j} ing={ing} />)}
            </section>
          )}
        </div>
      )}

      {groceryList.stores.length > 0 && (
        <section style={{ marginTop: "2rem", padding: "1rem 1.25rem", background: "var(--color-bg-card)", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
          <h3 style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", margin: "0 0 0.625rem" }}>Where to shop</h3>
          {groceryList.stores.map((s, i) => (
            <div key={i} style={{ marginBottom: "0.625rem", fontSize: "0.875rem" }}>
              <a
                href={s.verification?.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address ?? trip.meta.destination}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 600, color: "var(--color-brand)", textDecoration: "underline" }}
              >
                {s.name}<span className="sr-only"> (opens map in new tab)</span>
              </a>{" "}
              <VerifiedBadge verification={s.verification} compact />
              {s.note && <span style={{ color: "var(--color-text-muted)" }}> — {s.note}</span>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
