"use client";
import { useState } from "react";
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

function Counter({ value, min = 0, onChange }: { value: number; min?: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem" }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: "2rem", height: "2rem", borderRadius: "50%",
          border: "1.5px solid var(--color-border)",
          background: "transparent", color: "var(--color-text-muted)",
          fontSize: "1.125rem", cursor: "pointer", lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >−</button>
      <span style={{ minWidth: "1.5rem", textAlign: "center", fontWeight: 600, fontSize: "1.0625rem", color: "var(--color-text)" }}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{
          width: "2rem", height: "2rem", borderRadius: "50%",
          border: "1.5px solid var(--color-border)",
          background: "transparent", color: "var(--color-text-muted)",
          fontSize: "1.125rem", cursor: "pointer", lineHeight: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >+</button>
    </div>
  );
}

export default function GroupStep({ data, onUpdate, onNext, onBack }: Props) {
  const numAdults = data.numAdults ?? 2;
  const numKids = data.numKids ?? 0;
  const [kidAgesInput, setKidAgesInput] = useState((data.kidAges ?? []).join(", "));

  function handleKidAges(val: string) {
    setKidAgesInput(val);
    const ages = val.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n >= 0);
    onUpdate({ kidAges: ages });
  }

  return (
    <StepCard>
      <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-faint)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Step 2 of 6
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--color-text)", marginBottom: "0.375rem", lineHeight: 1.2 }}>
        Who's coming?
      </h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
        We'll tailor activities, meals, and packing lists for your exact group.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderRadius: "var(--radius-input)", border: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
          <div>
            <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>Adults</div>
            <div style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem" }}>Age 18+</div>
          </div>
          <Counter value={numAdults} min={1} onChange={(n) => onUpdate({ numAdults: n })} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderRadius: "var(--radius-input)", border: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
          <div>
            <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>Kids</div>
            <div style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem" }}>Under 18</div>
          </div>
          <Counter value={numKids} min={0} onChange={(n) => onUpdate({ numKids: n })} />
        </div>

        {numKids > 0 && (
          <div>
            <FieldLabel htmlFor="kidAges">Kid ages (comma-separated)</FieldLabel>
            <TextInput
              id="kidAges"
              placeholder={`e.g. ${Array.from({ length: numKids }, (_, i) => 4 + i * 2).join(", ")}`}
              value={kidAgesInput}
              onChange={(e) => handleKidAges(e.target.value)}
            />
            <p style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>
              Helps us recommend kid-appropriate activities and meals.
            </p>
          </div>
        )}

        <div style={{ padding: "0.875rem 1.25rem", borderRadius: "var(--radius-input)", background: "var(--color-bg-selected)", border: "1px solid var(--color-border)" }}>
          <span style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>
            👥 {numAdults} adult{numAdults !== 1 ? "s" : ""}{numKids > 0 ? ` + ${numKids} kid${numKids !== 1 ? "s" : ""}` : ""} &nbsp;·&nbsp; {numAdults + numKids} total
          </span>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={numAdults < 1} />
    </StepCard>
  );
}
