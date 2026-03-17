interface Props {
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}

export default function StepNav({ onNext, onBack, nextLabel = "Continue", nextDisabled = false }: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem", gap: "1rem" }}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "var(--radius-input)",
            border: "1px solid var(--color-border)",
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: "0.9375rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          style={{
            padding: "0.625rem 1.75rem",
            borderRadius: "var(--radius-input)",
            border: "none",
            background: nextDisabled ? "var(--color-brand-disabled)" : "var(--color-brand)",
            color: "var(--color-text-inverse)",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: nextDisabled ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}
