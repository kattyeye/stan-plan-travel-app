"use client";
import { CookInRatio, WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
import SectionLabel from "../ui/SectionLabel";
import Spinner from "../ui/Spinner";
import StepHeading from "../ui/StepHeading";
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
      <StepHeading
        step={4}
        totalSteps={6}
        title="Let's talk food"
        description="We'll build a meal plan, grocery list, and restaurant picks around your preferences."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        <div>
          <SectionLabel>How will you eat?</SectionLabel>
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
          <SectionLabel>Dietary needs <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {DIETARY.map((d) => (
              <Chip key={d} label={d} selected={dietary.includes(d)} onClick={() => toggleDietary(d)} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Cuisine preferences <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></SectionLabel>
          {suggestionsLoading && !suggestedCuisines ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-faint)", fontSize: "0.875rem", padding: "0.375rem 0" }}>
              <Spinner />
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
