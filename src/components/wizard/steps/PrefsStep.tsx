"use client";
import { PlanningStyle, BudgetTier, TripVibe, TravelMethod, WizardData } from "@/types/trip";
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
  suggestedVibes?: string[];
  suggestionsLoading?: boolean;
}

const VIBES: { value: TripVibe; label: string; emoji: string }[] = [
  { value: "laid-back", label: "Laid-back", emoji: "🛋️" },
  { value: "adventurous", label: "Adventurous", emoji: "🧗" },
  { value: "foodie", label: "Foodie", emoji: "🍽️" },
  { value: "nature", label: "Nature", emoji: "🌿" },
  { value: "cultural", label: "Cultural", emoji: "🏛️" },
  { value: "family-fun", label: "Family fun", emoji: "🎡" },
  { value: "nightlife", label: "Nightlife", emoji: "🍸" },
  { value: "live-music", label: "Live music", emoji: "🎶" },
];

const PLANNING: { value: PlanningStyle; label: string; desc: string }[] = [
  { value: "structured", label: "Structured", desc: "Every hour planned" },
  { value: "balanced", label: "Balanced", desc: "Some plans, some flow" },
  { value: "flexible", label: "Flexible", desc: "Go with the vibe" },
];

const BUDGET: { value: BudgetTier; label: string; desc: string; emoji: string }[] = [
  { value: "budget", label: "Budget", desc: "Keep costs down", emoji: "💸" },
  { value: "moderate", label: "Moderate", desc: "Treat ourselves a bit", emoji: "💰" },
  { value: "splurge", label: "Splurge", desc: "No holding back", emoji: "✨" },
];

const TRAVEL: { value: TravelMethod; label: string; emoji: string }[] = [
  { value: "car", label: "Car", emoji: "🚗" },
  { value: "plane", label: "Plane", emoji: "✈️" },
  { value: "train", label: "Train", emoji: "🚂" },
  { value: "other", label: "Other", emoji: "🚌" },
];


function RadioCard({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      style={{
        flex: 1,
        padding: "0.75rem 1rem",
        borderRadius: "var(--radius-input)",
        border: selected ? "2px solid var(--color-brand)" : "1.5px solid var(--color-border)",
        background: selected ? "var(--color-bg-selected)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}


export default function PrefsStep({ data, onUpdate, onNext, onBack, suggestedVibes, suggestionsLoading }: Props) {
  const vibes = data.vibes ?? [];

  function toggleVibe(v: TripVibe) {
    const next = vibes.includes(v) ? vibes.filter((x) => x !== v) : [...vibes, v];
    onUpdate({ vibes: next });
  }

  const vibeOptions = suggestedVibes
    ? VIBES.filter((v) => suggestedVibes.includes(v.value) || vibes.includes(v.value))
    : VIBES;

  const canContinue = !!(data.planningStyle && data.budget && data.travelMethod && vibes.length > 0);

  return (
    <StepCard>
      <StepHeading
        step={3}
        totalSteps={6}
        title="What's your vibe?"
        description="This shapes the whole feel of your plan."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        <div>
          <SectionLabel>Trip vibe (pick all that apply)</SectionLabel>
          {suggestionsLoading && !suggestedVibes ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-faint)", fontSize: "0.875rem", padding: "0.375rem 0" }}>
              <Spinner />
              Finding vibes for {data.destination}...
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {vibeOptions.map((v) => (
                <Chip key={v.value} label={v.label} emoji={v.emoji} selected={vibes.includes(v.value)} onClick={() => toggleVibe(v.value)} />
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionLabel>Planning style</SectionLabel>
          <div role="radiogroup" aria-label="Planning style" style={{ display: "flex", gap: "0.75rem" }}>
            {PLANNING.map((p) => (
              <RadioCard key={p.value} label={`${p.label} — ${p.desc}`} selected={data.planningStyle === p.value} onClick={() => onUpdate({ planningStyle: p.value })}>
                <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{p.label}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.125rem" }}>{p.desc}</div>
              </RadioCard>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Budget</SectionLabel>
          <div role="radiogroup" aria-label="Budget" style={{ display: "flex", gap: "0.75rem" }}>
            {BUDGET.map((b) => (
              <RadioCard key={b.value} label={`${b.label} — ${b.desc}`} selected={data.budget === b.value} onClick={() => onUpdate({ budget: b.value })}>
                <div aria-hidden="true" style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>{b.emoji}</div>
                <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{b.label}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.125rem" }}>{b.desc}</div>
              </RadioCard>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Getting there</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {TRAVEL.map((t) => (
              <Chip key={t.value} label={t.label} emoji={t.emoji} selected={data.travelMethod === t.value} onClick={() => onUpdate({ travelMethod: t.value })} />
            ))}
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={!canContinue} />
    </StepCard>
  );
}
