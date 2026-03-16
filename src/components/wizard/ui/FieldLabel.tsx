export default function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "var(--color-tea-green-800)",
        marginBottom: "0.375rem",
      }}
    >
      {children}
    </label>
  );
}
