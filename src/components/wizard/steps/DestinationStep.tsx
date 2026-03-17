"use client";
import { WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
import StepNav from "../ui/StepNav";
import FieldLabel from "../ui/FieldLabel";
import TextInput from "../ui/TextInput";
import PlacesAutocomplete from "../ui/PlacesAutocomplete";
import DateRangePicker from "../ui/DateRangePicker";

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
          <FieldLabel htmlFor="tripType">Trip type</FieldLabel>
          <TextInput
            id="tripType"
            placeholder="e.g. beach house, ski cabin, city trip…"
            value={data.tripType ?? ""}
            onChange={(e) => onUpdate({ tripType: e.target.value })}
          />
        </div>
      </div>

      <StepNav onNext={onNext} nextDisabled={!canContinue} />
    </StepCard>
  );
}
