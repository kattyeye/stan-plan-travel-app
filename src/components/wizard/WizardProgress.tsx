const STEP_LABELS = ["Destination", "Your group", "Style & vibe", "Meals", "Your stay", "Almost done"];

interface Props {
  currentStep: number;
  totalSteps: number;
}

export default function WizardProgress({ currentStep, totalSteps }: Props) {
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
        <div style={{ width: "100%", height: "4px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.75rem" }}>
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
        {/* Step dots with labels */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const done = stepNum < currentStep;
            const active = stepNum === currentStep;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                <div
                  style={{
                    width: active ? 12 : done ? 10 : 7,
                    height: active ? 12 : done ? 10 : 7,
                    borderRadius: "50%",
                    background: done ? "var(--color-brand)" : active ? "var(--color-brand)" : "var(--color-border)",
                    outline: active ? "3px solid var(--color-brand-light)" : "none",
                    transition: "all 0.25s ease",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
