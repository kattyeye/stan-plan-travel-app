import React from "react";

export default function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-cornsilk-50)",
        border: "1px solid var(--color-tea-green-200)",
        borderRadius: "14px",
        boxShadow: "0 2px 16px rgba(21, 24, 12, 0.07)",
        padding: "2rem",
      }}
    >
      {children}
    </div>
  );
}
