"use client";
import { useState } from "react";
import { GeneratedTrip, PackingItem } from "@/types/trip";

interface Props { trip: GeneratedTrip }

type CheckedState = Record<string, boolean>;

const SECTION_LABELS: Record<keyof GeneratedTrip["packingList"], string> = {
  clothingAdults: "👕 Clothing — Adults",
  clothingKids: "👗 Clothing — Kids",
  beachOutdoor: "🏖️ Beach & Outdoor",
  kitchen: "🍳 Kitchen",
  toiletries: "🧴 Toiletries",
  electronics: "📱 Electronics",
  evening: "🌙 Evening & Going Out",
  groupLogistics: "📋 Group Logistics",
  propertyProvides: "🏠 Property Provides",
};

function buildInitialState(packing: GeneratedTrip["packingList"]): CheckedState {
  const state: CheckedState = {};
  for (const [section, items] of Object.entries(packing) as [keyof typeof packing, PackingItem[]][]) {
    for (const item of items) {
      const key = `${section}::${item.item}`;
      state[key] = item.propertyProvides ?? false;
    }
  }
  return state;
}

export default function PackingSection({ trip }: Props) {
  const { packingList } = trip;
  const [checked, setChecked] = useState<CheckedState>(() => buildInitialState(packingList));

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function reset() {
    setChecked(buildInitialState(packingList));
  }

  const total = Object.keys(checked).length;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-tea-green-950)", marginBottom: "0.25rem" }}>
            Packing List
          </h2>
          <p style={{ color: "var(--color-tea-green-600)", fontSize: "0.875rem" }}>
            {done} of {total} packed
          </p>
        </div>
        <button
          onClick={reset}
          style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--color-tea-green-300)", background: "transparent", color: "var(--color-tea-green-700)", fontSize: "0.875rem", cursor: "pointer" }}
        >
          Reset
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: "6px", background: "var(--color-tea-green-100)", borderRadius: "999px", marginBottom: "1.75rem", overflow: "hidden" }}>
        <div style={{ height: "100%", background: "var(--color-tea-green-600)", borderRadius: "999px", width: `${(done / total) * 100}%`, transition: "width 0.2s" }} />
      </div>

      {(Object.entries(packingList) as [keyof typeof packingList, PackingItem[]][])
        .filter(([, items]) => items.length > 0)
        .map(([section, items]) => (
          <div key={section} style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontWeight: 600, color: "var(--color-tea-green-800)", fontSize: "0.9375rem", marginBottom: "0.625rem" }}>
              {SECTION_LABELS[section] ?? section}
            </h3>
            <div style={{ background: "var(--color-cornsilk-50)", border: "1px solid var(--color-tea-green-200)", borderRadius: "10px", overflow: "hidden" }}>
              {items.map((item, i) => {
                const key = `${section}::${item.item}`;
                const isChecked = checked[key] ?? false;
                return (
                  <label
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.625rem 1rem",
                      borderBottom: i < items.length - 1 ? "1px solid var(--color-tea-green-100)" : "none",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(key)}
                      style={{ width: "1rem", height: "1rem", accentColor: "var(--color-tea-green-600)", flexShrink: 0 }}
                    />
                    <span style={{
                      fontSize: "0.875rem",
                      color: isChecked ? "var(--color-tea-green-400)" : "var(--color-tea-green-800)",
                      textDecoration: isChecked ? "line-through" : "none",
                      transition: "color 0.12s",
                    }}>
                      {item.item}
                    </span>
                    {item.propertyProvides && (
                      <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--color-tea-green-500)", flexShrink: 0 }}>provided</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
