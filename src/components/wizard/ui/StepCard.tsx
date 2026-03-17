import React from "react";

export default function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "2rem",
      }}
    >
      {children}
    </div>
  );
}
