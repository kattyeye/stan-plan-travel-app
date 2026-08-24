/** Small bold label above a group of options within a step. */
export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontWeight: 600, color: "var(--color-text)",
      fontSize: "0.9375rem", marginBottom: "0.625rem",
    }}>
      {children}
    </p>
  );
}
