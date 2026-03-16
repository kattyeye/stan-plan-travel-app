"use client";
import { WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
import StepNav from "../ui/StepNav";
import FieldLabel from "../ui/FieldLabel";
import TextInput from "../ui/TextInput";

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
      <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-tea-green-500)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Step 1 of 6
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--color-tea-green-950)", marginBottom: "0.375rem", lineHeight: 1.2 }}>
        Where are you headed?
      </h2>
      <p style={{ color: "var(--color-tea-green-700)", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
        Tell us your destination and travel dates so we can plan around your trip.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <FieldLabel htmlFor="destination">Destination</FieldLabel>
          <TextInput
            id="destination"
            placeholder="e.g. Outer Banks, NC"
            value={data.destination ?? ""}
            onChange={(e) => onUpdate({ destination: e.target.value })}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <FieldLabel htmlFor="startDate">Arrival date</FieldLabel>
            <TextInput
              id="startDate"
              type="date"
              value={data.startDate ?? ""}
              onChange={(e) => handleDates(e.target.value, data.endDate ?? "")}
            />
          </div>
          <div>
            <FieldLabel htmlFor="endDate">Departure date</FieldLabel>
            <TextInput
              id="endDate"
              type="date"
              value={data.endDate ?? ""}
              onChange={(e) => handleDates(data.startDate ?? "", e.target.value)}
            />
          </div>
        </div>

        {data.nights !== undefined && data.nights > 0 && (
          <p style={{ color: "var(--color-tea-green-600)", fontSize: "0.875rem", fontWeight: 500 }}>
            🌙 {data.nights} night{data.nights !== 1 ? "s" : ""}
          </p>
        )}

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
