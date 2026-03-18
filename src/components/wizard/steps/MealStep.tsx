"use client";
import { CookInRatio, WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
import StepNav from "../ui/StepNav";
import Chip from "../ui/Chip";

interface Props {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext?: () => void;
  onBack?: () => void;
  suggestedCuisines?: string[];
  suggestionsLoading?: boolean;
}

const COOK_RATIO: { value: CookInRatio; label: string; desc: string; emoji: string }[] = [
  { value: "mostly-in", label: "Mostly cook in", desc: "Groceries + recipes", emoji: "🍳" },
  { value: "mix", label: "Mix it up", desc: "Some of both", emoji: "🔀" },
  { value: "mostly-out", label: "Mostly eat out", desc: "Restaurants & takeout", emoji: "🍽️" },
];

const DIETARY = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Nut allergy", "Halal", "Kosher", "Shellfish-free"];
const CUISINES = ["American", "Italian", "Mexican", "Asian", "Mediterranean", "BBQ", "Seafood", "Farm-to-table", "Comfort food", "Brunch"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem", marginBottom: "0.625rem" }}>
      {children}
    </p>
  );
}

const SPINNER = (
  <span style={{
    display: "inline-block", width: "14px", height: "14px",
    border: "2px solid var(--color-border)",
    borderTopColor: "var(--color-brand)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  }} />
);

export default function MealStep({ data, onUpdate, onNext, onBack, suggestedCuisines, suggestionsLoading }: Props) {
  const dietary = data.dietaryRestrictions ?? [];
  const cuisines = data.cuisinePreferences ?? [];
  const cuisineOptions = suggestedCuisines ?? CUISINES;

  function toggleDietary(item: string) {
    const next = dietary.includes(item) ? dietary.filter((x) => x !== item) : [...dietary, item];
    onUpdate({ dietaryRestrictions: next });
  }

  function toggleCuisine(item: string) {
    const next = cuisines.includes(item) ? cuisines.filter((x) => x !== item) : [...cuisines, item];
    onUpdate({ cuisinePreferences: next });
  }

  return (
    <StepCard>
      <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-faint)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Step 4 of 6
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--color-text)", marginBottom: "0.375rem", lineHeight: 1.2 }}>
        Let's talk food
      </h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
        We'll build a meal plan, grocery list, and restaurant picks around your preferences.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        <div>
          <SectionTitle>How will you eat?</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {COOK_RATIO.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => onUpdate({ cookInRatio: r.value })}
                style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.875rem 1.125rem",
                  borderRadius: "var(--radius-input)",
                  border: data.cookInRatio === r.value ? "2px solid var(--color-brand)" : "1.5px solid var(--color-border)",
                  background: data.cookInRatio === r.value ? "var(--color-bg-selected)" : "transparent",
                  cursor: "pointer", textAlign: "left", transition: "all 0.12s", width: "100%",
                }}
              >
                <span style={{ fontSize: "1.375rem" }}>{r.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{r.label}</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Dietary needs <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {DIETARY.map((d) => (
              <Chip key={d} label={d} selected={dietary.includes(d)} onClick={() => toggleDietary(d)} />
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Cuisine preferences <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></SectionTitle>
          {suggestionsLoading && !suggestedCuisines ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-faint)", fontSize: "0.875rem", padding: "0.375rem 0" }}>
              {SPINNER}
              Finding local cuisine for {data.destination}...
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {cuisineOptions.map((c) => (
                <Chip key={c} label={c} selected={cuisines.includes(c)} onClick={() => toggleCuisine(c)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!data.cookInRatio} />
    </StepCard>
  );
}
