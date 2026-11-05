import type { CSSProperties } from "react";

/** Shared inline styles for the trip page. Colours come only from design tokens. */

export const h2: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.5rem",
  fontWeight: 400,
  color: "var(--color-heading)",
  margin: 0,
  lineHeight: 1.2,
};

export const h3: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  color: "var(--color-text)",
  fontSize: "1rem",
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

export const eyebrow: CSSProperties = {
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-text-faint)",
};

export const muted: CSSProperties = { color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.55, margin: 0 };

export const card: CSSProperties = {
  background: "var(--color-bg-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

export const chip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  fontSize: "0.75rem",
  padding: "0.125rem 0.5rem",
  borderRadius: "var(--radius-chip)",
  background: "var(--color-bg-selected)",
  color: "var(--color-text-muted)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  lineHeight: 1.5,
};

export const chipWarm: CSSProperties = { ...chip, background: "var(--color-light-bronze-100)", color: "var(--color-light-bronze-700)" };

/** A 44px tappable pill (filters, actions). */
export const pillButton = (active = false): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.375rem",
  minHeight: 44,
  padding: "0 0.95rem",
  borderRadius: "var(--radius-chip)",
  border: `1px solid ${active ? "var(--color-brand)" : "var(--color-border)"}`,
  background: active ? "var(--color-brand)" : "var(--color-bg-card)",
  color: active ? "var(--color-text-inverse)" : "var(--color-text)",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  textDecoration: "none",
  flexShrink: 0,
});

export const primaryButton: CSSProperties = {
  ...pillButton(true),
  background: "var(--color-brand)",
  borderColor: "var(--color-brand)",
};

export const ghostButton: CSSProperties = {
  ...pillButton(false),
  background: "transparent",
  color: "var(--color-text-muted)",
};

export const iconButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  borderRadius: "var(--radius-chip)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-card)",
  color: "var(--color-text)",
  cursor: "pointer",
  flexShrink: 0,
};

export const warningBox: CSSProperties = {
  display: "flex",
  gap: "0.375rem",
  alignItems: "flex-start",
  fontSize: "0.8125rem",
  lineHeight: 1.45,
  color: "var(--color-warning-text)",
  background: "var(--color-warning-bg)",
  border: "1px solid var(--color-warning-border)",
  borderRadius: "8px",
  padding: "0.375rem 0.625rem",
  margin: "0.25rem 0",
};

export const link: CSSProperties = {
  color: "var(--color-brand)",
  textDecoration: "underline",
  textUnderlineOffset: 2,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
};
