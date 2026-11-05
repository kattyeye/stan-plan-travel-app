"use client";
import { useEffect, useRef } from "react";
import { TripSection, WizardData } from "@/types/trip";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import VoiceButton from "@/components/voice/VoiceButton";
import StepCard from "../ui/StepCard";
import StepNav from "../ui/StepNav";
import FieldLabel from "../ui/FieldLabel";
import { AMENITIES, SECTIONS } from "@/lib/options";

interface Props {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext?: () => void;
  onBack?: () => void;
  suggestedAmenities?: string[];
  suggestionsLoading?: boolean;
}



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

export default function ExtrasStep({ data, onUpdate, onNext, onBack, suggestedAmenities, suggestionsLoading }: Props) {
  const sections = data.sections ?? (["itinerary", "meals", "grocery", "restaurants", "activities", "packing"] as TripSection[]);
  const amenities = data.propertyAmenities ?? [];
  const amenityOptions = suggestedAmenities ?? AMENITIES;

  function toggleSection(s: TripSection) {
    const next = sections.includes(s) ? sections.filter((x) => x !== s) : [...sections, s];
    onUpdate({ sections: next });
  }

  function toggleAmenity(a: string) {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    onUpdate({ propertyAmenities: next });
  }

  return (
    <StepCard>
      <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-faint)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Step 5 of 6
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--color-text)", marginBottom: "0.375rem", lineHeight: 1.2 }}>
        What do you want in your plan?
      </h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
        Choose what to include and tell us about your property.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        <div>
          <SectionTitle>Include in my plan</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
            {SECTIONS.map((s) => {
              const selected = sections.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSection(s.value)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "0.75rem",
                    padding: "0.875rem 1rem",
                    borderRadius: "var(--radius-input)",
                    border: selected ? "2px solid var(--color-brand)" : "1.5px solid var(--color-border)",
                    background: selected ? "var(--color-bg-selected)" : "transparent",
                    cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                    position: "relative",
                  }}
                >
                  <span style={{ fontSize: "1.25rem", lineHeight: 1.2 }}>{s.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem" }}>{s.label}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.78125rem", marginTop: "0.125rem" }}>{s.desc}</div>
                  </div>
                  <span style={{
                    width: "1.125rem", height: "1.125rem", borderRadius: "50%", flexShrink: 0, marginTop: "0.125rem",
                    border: selected ? "none" : "1.5px solid var(--color-border)",
                    background: selected ? "var(--color-brand)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--color-text-inverse)", fontSize: "0.6rem", fontWeight: 700,
                    transition: "all 0.12s",
                  }}>
                    {selected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="propertyDesc">
            Property description <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span>
          </FieldLabel>
          <DictatedTextarea
            id="propertyDesc"
            placeholder="e.g. 4BR beachfront house in Outer Banks with private pool and full kitchen"
            value={data.propertyDescription ?? ""}
            onChange={(v) => onUpdate({ propertyDescription: v })}
          />
        </div>

        <div>
          <SectionTitle>Property amenities <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></SectionTitle>
          {suggestionsLoading && !suggestedAmenities ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-faint)", fontSize: "0.875rem", padding: "0.375rem 0" }}>
              {SPINNER}
              Checking amenities for {data.destination}...
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {amenityOptions.map((a) => {
                const selected = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    style={{
                      padding: "0.375rem 0.875rem",
                      borderRadius: "var(--radius-chip)",
                      border: selected ? "1.5px solid var(--color-brand)" : "1.5px solid var(--color-border)",
                      background: selected ? "var(--color-bg-selected)" : "transparent",
                      color: selected ? "var(--color-text)" : "var(--color-text-muted)",
                      fontSize: "0.875rem", fontWeight: selected ? 600 : 400,
                      cursor: "pointer", transition: "all 0.12s",
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} nextDisabled={sections.length === 0} />
    </StepCard>
  );
}

const MAX_DESCRIPTION = 1200; // matches propertyDescription in src/lib/validation.ts

/** The stay description, typed or spoken: dictated phrases are appended, and words show as you speak. */
function DictatedTextarea({ id, value, placeholder, onChange }: { id: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const speech = useSpeechInput(
    (heard) => {
      const cur = latest.current.trimEnd();
      const sentence = heard.charAt(0).toUpperCase() + heard.slice(1);
      const next = `${cur}${cur && !/[.!?]$/.test(cur) ? "." : ""}${cur ? " " : ""}${sentence}`.slice(0, MAX_DESCRIPTION);
      latest.current = next;
      onChange(next);
    },
    { continuous: true }
  );
  return (
    <div>
      <div style={{ position: "relative" }}>
        <textarea
          id={id}
          placeholder={speech.listening ? "Listening… describe the place" : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={MAX_DESCRIPTION}
          rows={3}
          style={{
            width: "100%", padding: speech.supported ? "0.625rem 3.5rem 0.625rem 0.875rem" : "0.625rem 0.875rem",
            borderRadius: "var(--radius-input)",
            border: `1px solid ${speech.listening ? "var(--color-border-focus)" : "var(--color-border)"}`,
            background: "var(--color-bg-input)",
            color: "var(--color-text)",
            fontSize: "0.9375rem", outline: "none", resize: "vertical",
            boxSizing: "border-box", fontFamily: "inherit",
          }}
        />
        <span style={{ position: "absolute", right: 6, top: 6 }}>
          <VoiceButton speech={speech} label="Describe your stay by voice" />
        </span>
      </div>
      {speech.listening && (
        <p aria-live="polite" style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "var(--color-text-muted)", fontStyle: "italic", minHeight: "1.2em" }}>
          {speech.interim ? `Hearing: ${speech.interim}` : "Listening — say things like “three bedrooms, hot tub, ten minutes from the beach”."}
        </p>
      )}
      {speech.error && <p role="alert" style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "var(--color-warning-text)" }}>{speech.error}</p>}
    </div>
  );
}
