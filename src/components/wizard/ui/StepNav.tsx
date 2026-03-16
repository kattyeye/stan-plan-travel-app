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
            borderRadius: "10px",
            border: "1px solid var(--color-tea-green-200)",
            background: "transparent",
            color: "var(--color-tea-green-700)",
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
            borderRadius: "10px",
            border: "none",
            background: nextDisabled ? "var(--color-tea-green-300)" : "var(--color-tea-green-600)",
            color: "var(--color-tea-green-50)",
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
