"use client";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Secondary text, e.g. "12/40". */
  meta?: string;
}

/** Two-to-four way switch for sub-views (Meal plan | Places to eat). */
export default function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", gap: "0.25rem", background: "var(--color-bg-selected)", borderRadius: "var(--radius-chip)", padding: "0.25rem", width: "100%", maxWidth: 420 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1, minHeight: 40, padding: "0.375rem 0.75rem", borderRadius: "var(--radius-chip)", border: "none",
              background: on ? "var(--color-bg-card)" : "transparent", color: on ? "var(--color-text)" : "var(--color-text-muted)",
              fontSize: "0.875rem", fontWeight: on ? 700 : 500, cursor: "pointer", boxShadow: on ? "var(--shadow-card)" : "none",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", whiteSpace: "nowrap",
            }}
          >
            {o.label}
            {o.meta && <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-faint)" }}>{o.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}
