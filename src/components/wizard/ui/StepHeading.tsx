/**
 * The eyebrow + title + description block every wizard step opens with.
 *
 * Was copy-pasted into all six step files, which meant six places to change
 * and six chances to drift. Also the natural seam for a React Native port.
 */
interface Props {
  step?: number;
  totalSteps?: number;
  title: string;
  description?: string;
  /** Overrides the "Step N of M" eyebrow. */
  eyebrow?: string;
}

export default function StepHeading({ step, totalSteps, title, description, eyebrow }: Props) {
  const label = eyebrow ?? (step && totalSteps ? `Step ${step} of ${totalSteps}` : undefined);

  return (
    <>
      {label && (
        <p style={{
          fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.08em",
          color: "var(--color-text-faint)", textTransform: "uppercase",
          marginBottom: "0.5rem",
        }}>
          {label}
        </p>
      )}
      <h2 style={{
        fontFamily: "var(--font-display)", fontSize: "1.75rem",
        color: "var(--color-text)", marginBottom: description ? "0.375rem" : "1.75rem",
        lineHeight: 1.2,
      }}>
        {title}
      </h2>
      {description && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.75rem" }}>
          {description}
        </p>
      )}
    </>
  );
}
