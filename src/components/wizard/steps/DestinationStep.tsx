"use client";
import { WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
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
}

export default function DestinationStep({ data, onUpdate, onNext }: Props) {
  const canContinue = !!(data.destination && data.startDate && data.endDate);

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
      <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-faint)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Step 1 of 6
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--color-text)", marginBottom: "0.375rem", lineHeight: 1.2 }}>
        Where are you headed?
      </h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
        Tell us your destination and travel dates so we can plan around your trip.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <FieldLabel>Destination</FieldLabel>
          <PlacesAutocomplete
            value={data.destination ?? ""}
            onChange={(val) => onUpdate({ destination: val })}
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {TRIP_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                emoji={t.emoji}
                selected={data.tripType === t.value}
                onClick={() => onUpdate({ tripType: t.value })}
              />
            ))}
          </div>
        </div>
      </div>

      <StepNav onNext={onNext} nextDisabled={!canContinue} />
    </StepCard>
  );
}
