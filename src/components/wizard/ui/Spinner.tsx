/**
 * Inline loading spinner for destination-aware suggestions.
 *
 * The `spin` keyframe lives in globals.css and is disabled automatically under
 * `prefers-reduced-motion`.
 */
export default function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading suggestions"
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        border: "2px solid var(--color-border)",
        borderTopColor: "var(--color-brand)",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}
