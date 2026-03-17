"use client";

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      style={{
        position: "absolute", top: "-100%", left: "1rem", zIndex: 9999,
        padding: "0.5rem 1rem", borderRadius: "6px",
        background: "var(--color-brand)", color: "var(--color-text-inverse)",
        fontWeight: 700, fontSize: "0.875rem", textDecoration: "none",
        transition: "top 0.1s",
      }}
      onFocus={(e) => { e.currentTarget.style.top = "1rem"; }}
      onBlur={(e) => { e.currentTarget.style.top = "-100%"; }}
    >
      Skip to main content
    </a>
  );
}
