interface Props {
  currentStep: number;
  totalSteps: number;
}

export default function WizardProgress({ currentStep, totalSteps }: Props) {
  const pct = Math.round((currentStep / totalSteps) * 100);
  return (
    <div style={{
      background: "var(--color-bg-card)",
      borderBottom: "1px solid var(--color-border)",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0.875rem 1.5rem 0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-heading)" }}>
            Plan your trip
          </span>
          <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text-muted)" }}>
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ width: "100%", height: "3px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden", marginBottom: "0.625rem" }}>
          <div
            style={{
              height: "3px",
              background: "var(--color-brand)",
              width: `${pct}%`,
              borderRadius: "999px",
              transition: "width 0.35s ease",
            }}
          />
        </div>
        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {Array.from({ length: totalSteps }).map((_, i) => {
            const stepNum = i + 1;
            const done = stepNum < currentStep;
            const active = stepNum === currentStep;
            return (
              <div
                key={i}
                style={{
                  width: done ? 10 : active ? 10 : 6,
                  height: done ? 10 : active ? 10 : 6,
                  borderRadius: "50%",
                  background: done ? "var(--color-brand)" : active ? "var(--color-brand)" : "var(--color-border)",
                  outline: active ? "3px solid var(--color-brand-light)" : "none",
                  transition: "all 0.2s",
                  alignSelf: "center",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
