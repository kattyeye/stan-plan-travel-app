"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import StepCard from "@/components/wizard/ui/StepCard";

/**
 * Finishes a magic-link sign-in. The token is sent by POST from the browser,
 * so link-scanning email filters (which don't run scripts) can't use it up.
 */
export default function VerifyLogin() {
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { next?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "That link didn't work.");
        // Full navigation so the navbar and server pages see the new session.
        window.location.replace(json.next ?? "/account");
      })
      .catch((err: Error) => setError(err.message));
  }, [token]);

  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <StepCard>
        {error ? (
          <div role="alert">
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.5rem", color: "var(--color-heading)", margin: "0 0 0.5rem" }}>That link didn&apos;t work</h1>
            <p style={{ color: "var(--color-text-muted)", margin: "0 0 1rem", lineHeight: 1.55 }}>{error}</p>
            <Link href="/login" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 1.25rem", borderRadius: "var(--radius-chip)", background: "var(--color-brand)", color: "var(--color-text-inverse)", fontWeight: 700, textDecoration: "none" }}>
              Send a new link
            </Link>
          </div>
        ) : (
          <p role="status" style={{ display: "flex", alignItems: "center", gap: "0.625rem", margin: 0, color: "var(--color-text)" }}>
            <Loader2 size={18} aria-hidden="true" className="animate-spin" /> Signing you in…
          </p>
        )}
      </StepCard>
    </div>
  );
}
