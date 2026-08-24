"use client";
import { WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
import StepHeading from "../ui/StepHeading";
import StepNav from "../ui/StepNav";
import FieldLabel from "../ui/FieldLabel";
import Chip from "../ui/Chip";
import PlacesAutocomplete from "../ui/PlacesAutocomplete";
import DateRangePicker from "../ui/DateRangePicker";

const TRIP_TYPES = [
  { value: "beach house", label: "Beach house", emoji: "🏖️" },
  { value: "ski cabin", label: "Ski cabin", emoji: "⛷️" },
  { value: "city trip", label: "City trip", emoji: "🏙️" },
  { value: "national park", label: "National park", emoji: "🏔️" },
  { value: "cruise", label: "Cruise", emoji: "🚢" },
  { value: "road trip", label: "Road trip", emoji: "🚗" },
  { value: "honeymoon", label: "Honeymoon", emoji: "💍" },
  { value: "camping", label: "Camping", emoji: "⛺" },
  { value: "villa", label: "Villa / resort", emoji: "🏡" },
  { value: "other", label: "Other", emoji: "✈️" },
];

interface Props {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext?: () => void;
  onBack?: () => void;
  onDestinationSelected?: (destination: string) => void;
  suggestedTripTypes?: string[];
  suggestionsLoading?: boolean;
}

export default function DestinationStep({ data, onUpdate, onNext, onDestinationSelected, suggestedTripTypes, suggestionsLoading }: Props) {
  const canContinue = !!(data.destination && data.startDate && data.endDate && data.tripType);

  function handleDates(start: string, end: string) {
    if (start && end) {
      const ms = new Date(end).getTime() - new Date(start).getTime();
      const nights = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
      onUpdate({ startDate: start, endDate: end, nights });
    } else {
      onUpdate({ startDate: start, endDate: end });
    }
  }

  return (
    <StepCard>
      {/* Escape hatch to the fast path — most useful before any typing has
          happened, so it only shows on an untouched step 1. */}
      {!data.destination && (
        <a
          href="/wizard/voice"
          style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            padding: "0.75rem 0.875rem", marginBottom: "1.5rem",
            borderRadius: "var(--radius-input)",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-selected)",
            textDecoration: "none", color: "var(--color-text)",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>🎙️</span>
          <span style={{ fontSize: "0.875rem", lineHeight: 1.4 }}>
            <strong>In a hurry?</strong> Say or type your whole trip in one go
            and we&apos;ll fill this in.
          </span>
        </a>
      )}

      <StepHeading
        step={1}
        totalSteps={6}
        title="Where are you headed?"
        description="Tell us your destination and travel dates so we can plan around your trip."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <FieldLabel>Destination</FieldLabel>
          <PlacesAutocomplete
            value={data.destination ?? ""}
            onChange={(val) => onUpdate({ destination: val })}
            onSelect={(val) => onDestinationSelected?.(val)}
          />
        </div>

        <div>
          <FieldLabel>Travel dates</FieldLabel>
          <DateRangePicker
            startDate={data.startDate ?? ""}
            endDate={data.endDate ?? ""}
            onChange={handleDates}
          />
          {data.nights !== undefined && data.nights > 0 && (
            <p style={{ color: "var(--color-brand)", fontSize: "0.875rem", fontWeight: 500, marginTop: "0.5rem" }}>
              🌙 {data.nights} night{data.nights !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div>
          <FieldLabel>Trip type</FieldLabel>
          {suggestionsLoading && !suggestedTripTypes ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-faint)", fontSize: "0.875rem", padding: "0.375rem 0" }}>
              <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-brand)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              Finding trip types for {data.destination}...
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {(suggestedTripTypes
                ? TRIP_TYPES.filter((t) => suggestedTripTypes.includes(t.value) || data.tripType === t.value)
                : TRIP_TYPES
              ).map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  emoji={t.emoji}
                  selected={data.tripType === t.value}
                  onClick={() => onUpdate({ tripType: t.value })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <StepNav onNext={onNext} nextDisabled={!canContinue} />
    </StepCard>
  );
}
