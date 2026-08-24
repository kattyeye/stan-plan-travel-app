"use client";

const STEP_LABELS = ["Destination", "Your group", "Style & vibe", "Meals", "Your stay", "Almost done"];

interface Props {
  currentStep: number;
  totalSteps: number;
  /**
   * Jump to an already-completed step. Omitted in contexts with no navigation,
   * in which case the dots render as plain indicators.
   */
  onStepSelect?: (step: number) => void;
}

export default function WizardProgress({ currentStep, totalSteps, onStepSelect }: Props) {
  const pct = Math.round((currentStep / totalSteps) * 100);
  const label = STEP_LABELS[currentStep - 1] ?? `Step ${currentStep}`;

  return (
    <div style={{
      background: "var(--color-bg-card)",
      borderBottom: "1px solid var(--color-border)",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0.875rem 1.5rem 0.875rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-heading)" }}>
            {label}
          </span>
          <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-faint)" }}>
            {currentStep} / {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Step ${currentStep} of ${totalSteps}: ${label}`}
          style={{ width: "100%", height: "4px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.75rem" }}
        >
          <div
            style={{
              height: "4px",
              background: "var(--color-brand)",
              width: `${pct}%`,
              borderRadius: "999px",
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* Step dots — completed steps are clickable so you can go back and
            change an answer without stepping through the whole wizard. */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const done = stepNum < currentStep;
            const active = stepNum === currentStep;
            const navigable = done && !!onStepSelect;

            const dot = (
              <span
                aria-hidden="true"
                style={{
                  display: "block",
                  width: active ? 12 : done ? 10 : 7,
                  height: active ? 12 : done ? 10 : 7,
                  borderRadius: "50%",
                  background: done || active ? "var(--color-brand)" : "var(--color-border)",
                  outline: active ? "3px solid var(--color-brand-light)" : "none",
                  transition: "all 0.25s ease",
                }}
              />
            );

            if (!navigable) {
              return (
                <span key={stepNum} style={dotWrapper}>
                  {dot}
                </span>
              );
            }

            return (
              <button
                key={stepNum}
                type="button"
                onClick={() => onStepSelect(stepNum)}
                title={`Back to ${STEP_LABELS[i] ?? `step ${stepNum}`}`}
                aria-label={`Go back to step ${stepNum}: ${STEP_LABELS[i] ?? ""}`}
                style={{
                  ...dotWrapper,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  // Keeps the tap target usable on a phone without moving the dot.
                  padding: "0.5rem 0.75rem",
                  margin: "-0.5rem -0.75rem",
                }}
              >
                {dot}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const dotWrapper: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.25rem",
};
