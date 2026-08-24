"use client";
import { useState } from "react";
import { Mic, Square, Sparkles, ArrowRight, Pencil } from "lucide-react";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { MAX_INTENT_TEXT, type ParseIntentResult } from "@/core/intent";
import { FIELD_LABELS, applyDefaults, calcNights, missingRequiredFields, type RequiredField } from "@/core/wizard-machine";
import type { WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
import FieldLabel from "../ui/FieldLabel";
import TextInput from "../ui/TextInput";

const EXAMPLE =
  "Hey Irie, I want to go to the Bahamas for 4 days and swim with stingrays. I'm flexible, and I need a 2 bedroom place.";

type Stage = "capture" | "confirm";

export default function VoiceIntake() {
  const speech = useSpeechInput();
  const [stage, setStage] = useState<Stage>("capture");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseIntentResult | null>(null);
  const [data, setData] = useState<Partial<WizardData>>({});
  const [submitting, setSubmitting] = useState(false);

  const text = speech.transcript;
  const missing = missingRequiredFields(data);

  async function handleParse() {
    const trimmed = text.trim();
    if (!trimmed || parsing) return;
    if (speech.listening) speech.stop();

    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not understand that.");
      setResult(json as ParseIntentResult);
      setData(withDerivedDates((json as ParseIntentResult).data));
      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit() {
    if (missing.length > 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wizardData: applyDefaults(data) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (stage === "confirm" && result) {
    return (
      <ConfirmStage
        result={result}
        data={data}
        missing={missing}
        error={error}
        submitting={submitting}
        onChange={(patch) => setData((prev) => withDerivedDates({ ...prev, ...patch }))}
        onBack={() => setStage("capture")}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <StepCard>
      <p style={eyebrow}>Quick start</p>
      <h2 style={heading}>Just tell us about your trip</h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        Say it or type it — whatever you know. We&apos;ll ask for anything missing.
      </p>

      <label htmlFor="intake" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Describe your trip
      </label>
      <textarea
        id="intake"
        value={text}
        onChange={(e) => speech.setTranscript(e.target.value.slice(0, MAX_INTENT_TEXT))}
        placeholder={EXAMPLE}
        rows={5}
        style={{
          width: "100%",
          padding: "0.875rem",
          borderRadius: "var(--radius-input)",
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-input)",
          color: "var(--color-text)",
          fontSize: "1rem",
          fontFamily: "inherit",
          lineHeight: 1.6,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        {speech.supported ? (
          <button
            type="button"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            aria-pressed={speech.listening}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 1rem",
              borderRadius: "var(--radius-chip)",
              border: `1.5px solid ${speech.listening ? "var(--color-brand)" : "var(--color-border)"}`,
              background: speech.listening ? "var(--color-bg-selected)" : "transparent",
              color: "var(--color-text)",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            {speech.listening ? <Square size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
            {speech.listening ? "Stop" : "Speak"}
          </button>
        ) : (
          <span style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)" }}>
            Voice input isn&apos;t available in this browser — typing works just as well.
          </span>
        )}
        <span style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
          {text.length}/{MAX_INTENT_TEXT}
        </span>
      </div>

      <div aria-live="polite" style={{ minHeight: "1.25rem", marginTop: "0.5rem" }}>
        {speech.listening && (
          <span style={{ fontSize: "0.8125rem", color: "var(--color-brand)" }}>Listening…</span>
        )}
        {speech.error && (
          <span style={{ fontSize: "0.8125rem", color: "var(--color-error-text)" }}>{speech.error}</span>
        )}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <button
        type="button"
        onClick={handleParse}
        disabled={!text.trim() || parsing}
        style={primaryButton(!!text.trim() && !parsing)}
      >
        {parsing ? "Reading that…" : "Continue"}
        {!parsing && <ArrowRight size={16} aria-hidden="true" />}
      </button>

      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <a href="/wizard" style={{ color: "var(--color-brand)", fontSize: "0.875rem" }}>
          Prefer the step-by-step form?
        </a>
      </p>
    </StepCard>
  );
}

function ConfirmStage({
  result, data, missing, error, submitting, onChange, onBack, onSubmit,
}: {
  result: ParseIntentResult;
  data: Partial<WizardData>;
  missing: RequiredField[];
  error: string | null;
  submitting: boolean;
  onChange: (patch: Partial<WizardData>) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const understood = summarize(data);

  return (
    <StepCard>
      <p style={eyebrow}>Check this over</p>
      <h2 style={heading}>Here&apos;s what we understood</h2>
      {result.interpretation && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.25rem" }}>
          <Sparkles size={14} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: "0.35rem" }} />
          {result.interpretation}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {understood.map((chip) => (
          <span key={chip} style={{
            padding: "0.35rem 0.8rem",
            borderRadius: "var(--radius-chip)",
            background: "var(--color-bg-selected)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontSize: "0.8125rem",
          }}>
            {chip}
          </span>
        ))}
        {understood.length === 0 && (
          <span style={{ color: "var(--color-text-faint)", fontSize: "0.875rem" }}>
            Not much yet — fill in the details below.
          </span>
        )}
      </div>

      {result.unmapped.length > 0 && (
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
          We noted this for your plan but didn&apos;t file it anywhere: {result.unmapped.join("; ")}
        </p>
      )}

      {missing.length > 0 && (
        <>
          <p style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--color-text)", marginBottom: "0.875rem" }}>
            Just {missing.length} more thing{missing.length === 1 ? "" : "s"}:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            {missing.map((field) => (
              <GapField key={field} field={field} data={data} onChange={onChange} />
            ))}
          </div>
        </>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <button type="button" onClick={onSubmit} disabled={missing.length > 0 || submitting} style={primaryButton(missing.length === 0 && !submitting)}>
        {submitting ? "Redirecting to checkout…" : "Build my trip plan"}
      </button>
      <p style={{ textAlign: "center", color: "var(--color-text-faint)", fontSize: "0.8125rem", marginTop: "0.75rem" }}>
        $19 · Your plan will be ready in a few minutes.
      </p>

      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between" }}>
        <button type="button" onClick={onBack} style={linkButton}>
          <Pencil size={13} aria-hidden="true" /> Change what I said
        </button>
        <a href="/wizard" style={{ ...linkButton, textDecoration: "none" }}>Use the full form</a>
      </div>
    </StepCard>
  );
}

function GapField({
  field, data, onChange,
}: {
  field: RequiredField;
  data: Partial<WizardData>;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const label = FIELD_LABELS[field];

  if (field === "numAdults") {
    return (
      <div>
        <FieldLabel htmlFor={field}>{label}</FieldLabel>
        <TextInput
          id={field}
          type="number"
          min={1}
          value={data.numAdults ?? ""}
          onChange={(e) => onChange({ numAdults: Number(e.target.value) || undefined })}
        />
      </div>
    );
  }

  if (field === "startDate" || field === "endDate") {
    return (
      <div>
        <FieldLabel htmlFor={field}>{label}</FieldLabel>
        <TextInput
          id={field}
          type="date"
          value={data[field] ?? ""}
          onChange={(e) => onChange({ [field]: e.target.value } as Partial<WizardData>)}
        />
        {field === "startDate" && data.nights ? (
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-faint)", marginTop: "0.375rem" }}>
            You said {data.nights} night{data.nights === 1 ? "" : "s"} — we&apos;ll work out the end date if you leave it.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <FieldLabel htmlFor={field}>{label}</FieldLabel>
      <TextInput
        id={field}
        type={field === "email" ? "email" : "text"}
        placeholder={field === "email" ? "you@example.com" : undefined}
        value={(data[field] as string) ?? ""}
        onChange={(e) => onChange({ [field]: e.target.value } as Partial<WizardData>)}
      />
    </div>
  );
}

/**
 * Fill in whichever date can be inferred from the other plus the stated
 * duration. Someone who said "4 days" and picked a start date shouldn't be
 * asked for the end date as well.
 */
function withDerivedDates(data: Partial<WizardData>): Partial<WizardData> {
  const next = { ...data };

  if (next.startDate && next.nights && !next.endDate) {
    next.endDate = addDays(next.startDate, next.nights);
  } else if (next.endDate && next.nights && !next.startDate) {
    next.startDate = addDays(next.endDate, -next.nights);
  }

  if (next.startDate && next.endDate) {
    const nights = calcNights(next.startDate, next.endDate);
    if (nights > 0) next.nights = nights;
  }
  return next;
}

function addDays(isoDate: string, days: number): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return undefined;
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Human-readable chips for whatever was successfully extracted. */
function summarize(data: Partial<WizardData>): string[] {
  const chips: string[] = [];
  if (data.destination) chips.push(`📍 ${data.destination}`);
  if (data.nights) chips.push(`🌙 ${data.nights} night${data.nights === 1 ? "" : "s"}`);
  if (data.startDate) chips.push(`📅 from ${data.startDate}`);
  if (data.numAdults) chips.push(`👥 ${data.numAdults} adult${data.numAdults === 1 ? "" : "s"}`);
  if (data.numKids) chips.push(`🧒 ${data.numKids} kid${data.numKids === 1 ? "" : "s"}`);
  if (data.bedrooms) chips.push(`🛏 ${data.bedrooms} bedroom${data.bedrooms === 1 ? "" : "s"}`);
  if (data.planningStyle) chips.push(`🧭 ${data.planningStyle}`);
  if (data.budget) chips.push(`💰 ${data.budget}`);
  if (data.tripType) chips.push(`🏡 ${data.tripType}`);
  for (const vibe of data.vibes ?? []) chips.push(`✨ ${vibe}`);
  for (const diet of data.dietaryRestrictions ?? []) chips.push(`🥗 ${diet}`);
  if (data.propertyDescription) chips.push(`📝 ${data.propertyDescription.slice(0, 60)}`);
  return chips;
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" style={{
      color: "var(--color-error-text)", fontSize: "0.875rem",
      margin: "0 0 0.75rem", padding: "0.625rem 0.875rem",
      background: "var(--color-error-bg)", borderRadius: "8px",
      border: "1px solid var(--color-error-border)",
    }}>
      {children}
    </p>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em",
  color: "var(--color-text-faint)", textTransform: "uppercase", marginBottom: "0.5rem",
};

const heading: React.CSSProperties = {
  fontFamily: "var(--font-display)", fontSize: "1.75rem",
  color: "var(--color-text)", marginBottom: "0.375rem", lineHeight: 1.2,
};

const linkButton: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.35rem",
  background: "none", border: "none", color: "var(--color-brand)",
  fontSize: "0.875rem", cursor: "pointer", padding: 0,
};

function primaryButton(enabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    marginTop: "1.25rem",
    padding: "0.875rem",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
    borderRadius: "var(--radius-input)",
    border: "none",
    background: enabled ? "var(--color-brand)" : "var(--color-brand-disabled)",
    color: "var(--color-text-inverse)",
    fontSize: "1rem", fontWeight: 700,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}
