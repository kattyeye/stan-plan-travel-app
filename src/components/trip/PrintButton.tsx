"use client";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.08)",
        color: "var(--color-tea-green-100)",
        fontSize: "0.875rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Printer size={15} aria-hidden="true" />
      Print / Save PDF
    </button>
  );
}
