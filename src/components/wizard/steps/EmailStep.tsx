"use client";
import { useState } from "react";
import { WizardData } from "@/types/trip";
import StepCard from "../ui/StepCard";
import FieldLabel from "../ui/FieldLabel";
import TextInput from "../ui/TextInput";
import { clearWizardDraft } from "../WizardShell";

interface Props {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext?: () => void;
  onBack?: () => void;
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function EmailStep({ data, onUpdate, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = isValidEmail(data.email ?? "");
  const canSubmit = emailValid && !!(data.tripNickname ?? "").trim();

  async function handleSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wizardData: data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");
      clearWizardDraft();
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <StepCard>
      <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-faint)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Step 6 of 6
      </p>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", color: "var(--color-text)", marginBottom: "0.375rem", lineHeight: 1.2 }}>
        Almost there!
      </h2>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
        Give your trip a name and drop your email — we'll send your plan here when it's ready.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <FieldLabel htmlFor="tripNickname">Trip nickname</FieldLabel>
          <TextInput
            id="tripNickname"
            placeholder="e.g. OBX Summer 2025, Ski Trip with the Crew"
            value={data.tripNickname ?? ""}
            onChange={(e) => onUpdate({ tripNickname: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <TextInput
            id="email"
            type="email"
            placeholder="you@example.com"
            value={data.email ?? ""}
            onChange={(e) => onUpdate({ email: e.target.value })}
          />
          <p style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>
            We'll send your trip plan here. No spam, ever.
          </p>
        </div>

        <div style={{ padding: "1.25rem", borderRadius: "var(--radius-input)", background: "var(--color-bg)", border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Your trip summary</p>
          {data.destination && <SummaryRow emoji="📍" label={data.destination} />}
          {data.startDate && data.endDate && (
            <SummaryRow emoji="📅" label={`${data.startDate} → ${data.endDate}${data.nights ? ` (${data.nights} nights)` : ""}`} />
          )}
          {(data.numAdults || data.numKids) && (
            <SummaryRow emoji="👥" label={`${data.numAdults ?? 0} adult${(data.numAdults ?? 0) !== 1 ? "s" : ""}${data.numKids ? ` + ${data.numKids} kid${data.numKids !== 1 ? "s" : ""}` : ""}`} />
          )}
          {data.budget && <SummaryRow emoji="💰" label={data.budget.charAt(0).toUpperCase() + data.budget.slice(1) + " budget"} />}
          {data.cookInRatio && <SummaryRow emoji="🍴" label={{ "mostly-in": "Mostly cooking in", "mix": "Mix of cooking & eating out", "mostly-out": "Mostly eating out" }[data.cookInRatio]} />}
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        {error && (
          <p role="alert" style={{ color: "var(--color-error-text)", fontSize: "0.875rem", marginBottom: "0.75rem", padding: "0.625rem 0.875rem", background: "var(--color-error-bg)", borderRadius: "8px", border: "1px solid var(--color-error-border)" }}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          aria-disabled={!canSubmit || loading}
          aria-busy={loading}
          style={{
            width: "100%", padding: "0.875rem",
            borderRadius: "var(--radius-input)",
            border: "none",
            background: canSubmit && !loading ? "var(--color-brand)" : "var(--color-brand-disabled)",
            color: "var(--color-text-inverse)",
            fontSize: "1rem", fontWeight: 700,
            cursor: canSubmit && !loading ? "pointer" : "not-allowed",
            letterSpacing: "0.01em", transition: "background 0.15s",
          }}
        >
          {loading ? "Redirecting to checkout…" : "Build my trip plan →"}
        </button>
        <p style={{ textAlign: "center", color: "var(--color-text-faint)", fontSize: "0.8125rem", marginTop: "0.75rem" }}>
          $19 · Your plan will be ready in a few minutes.
        </p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--color-brand)", fontSize: "0.875rem", cursor: "pointer", padding: 0 }}
        >
          ← Back
        </button>
      </div>
    </StepCard>
  );
}

function SummaryRow({ emoji, label }: { emoji: string; label: string | undefined }) {
  if (!label) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  );
}
