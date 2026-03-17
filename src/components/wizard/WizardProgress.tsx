interface Props {
  currentStep: number;
  totalSteps: number;
}

export default function WizardProgress({ currentStep, totalSteps }: Props) {
  const pct = Math.round((currentStep / totalSteps) * 100);
  return (
    <div style={{ width: "100%", height: "4px", background: "var(--color-border)" }}>
      <div
        style={{
          height: "4px",
          background: "var(--color-brand)",
          width: `${pct}%`,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}
