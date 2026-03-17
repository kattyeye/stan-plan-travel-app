interface Props {
  label: string;
  selected: boolean;
  onClick: () => void;
  emoji?: string;
}

export default function Chip({ label, selected, onClick, emoji }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.4rem 0.9rem",
        borderRadius: "var(--radius-chip)",
        border: selected ? "1.5px solid var(--color-brand)" : "1.5px solid var(--color-border)",
        background: selected ? "var(--color-bg-selected)" : "transparent",
        color: selected ? "var(--color-text)" : "var(--color-text-muted)",
        fontSize: "0.875rem",
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.12s",
        whiteSpace: "nowrap",
      }}
    >
      {emoji && <span>{emoji}</span>}
      {label}
    </button>
  );
}
