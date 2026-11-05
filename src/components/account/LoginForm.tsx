"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import StepCard from "@/components/wizard/ui/StepCard";
import FieldLabel from "@/components/wizard/ui/FieldLabel";
import TextInput from "@/components/wizard/ui/TextInput";

type Stage = { kind: "form" } | { kind: "sent"; email: string; devLink?: string };

/** Email → one-tap sign-in link. No passwords. */
export default function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: { signedIn: boolean; email?: string }) => setSignedInAs(s.signedIn ? s.email ?? null : null))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, next }) });
      const json = (await res.json().catch(() => ({}))) as { error?: string; devLink?: string };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      setStage({ kind: "sent", email: email.trim(), devLink: json.devLink });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <StepCard>
        {stage.kind === "form" ? (
          <form onSubmit={submit}>
            <h1 style={h1}>Sign in to see your trips</h1>
            <p style={lead}>We&apos;ll email you a one-tap link — no password. Every plan made with your email shows up, including ones from before you signed in.</p>
            {signedInAs && (
              <p style={{ ...lead, padding: "0.625rem 0.875rem", background: "var(--color-bg-selected)", borderRadius: "var(--radius-input)" }}>
                You&apos;re signed in as <strong>{signedInAs}</strong>. <Link href={next} style={{ color: "var(--color-brand)", fontWeight: 600 }}>Go to my trips →</Link>
              </p>
            )}
            <FieldLabel htmlFor="login-email">Email address</FieldLabel>
            <TextInput id="login-email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minHeight: 48 }} />
            {error && <p role="alert" style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "var(--color-error-text)" }}>{error}</p>}
            <button type="submit" disabled={busy || !email.includes("@")} style={{ ...primary, marginTop: "1rem", opacity: busy || !email.includes("@") ? 0.6 : 1 }}>
              <Mail size={16} aria-hidden="true" /> {busy ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        ) : (
          <div aria-live="polite">
            <h1 style={h1}>Check your inbox</h1>
            <p style={lead}>
              We sent a sign-in link to <strong style={{ color: "var(--color-text)" }}>{stage.email}</strong>. It works once and expires in 15 minutes. Not there? Check spam or promotions.
            </p>
            {stage.devLink && (
              <a href={stage.devLink} style={{ ...primary, marginBottom: "0.75rem", textDecoration: "none" }}>
                Open sign-in link (local dev — no email service) <ArrowRight size={16} aria-hidden="true" />
              </a>
            )}
            <button type="button" onClick={() => setStage({ kind: "form" })} style={ghost}>Use a different email</button>
          </div>
        )}
      </StepCard>
      <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "1rem" }}>
        New here? <Link href="/wizard" style={{ color: "var(--color-brand)", fontWeight: 600 }}>Plan a trip</Link> — your first one is free.
      </p>
    </div>
  );
}

const h1: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.75rem", color: "var(--color-heading)", margin: "0 0 0.5rem", lineHeight: 1.2 };
const lead: React.CSSProperties = { fontSize: "0.9375rem", color: "var(--color-text-muted)", lineHeight: 1.55, margin: "0 0 1.25rem" };
const primary: React.CSSProperties = {
  width: "100%", minHeight: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", borderRadius: "var(--radius-chip)",
  border: "none", background: "var(--color-brand)", color: "var(--color-text-inverse)", fontWeight: 700, fontSize: "0.9375rem", cursor: "pointer",
};
const ghost: React.CSSProperties = { ...primary, background: "transparent", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" };
