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
        borderRadius: "999px",
        border: "1px solid var(--color-tea-green-600)",
        background: "transparent",
        color: "var(--color-tea-green-300)",
        fontSize: "0.8125rem",
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <Printer size={15} aria-hidden="true" />
      Print / Save PDF
    </button>
  );
}
