"use client";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        window.location.assign("/");
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", minHeight: 40, padding: "0 0.875rem", borderRadius: "var(--radius-chip)", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-muted)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
    >
      <LogOut size={14} aria-hidden="true" /> Sign out
    </button>
  );
}
