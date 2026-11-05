"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, UserPlus } from "lucide-react";
import type { BetaTester } from "@/lib/beta";

async function call(method: "POST" | "DELETE", body: { email: string; note?: string }) {
  const res = await fetch("/api/admin/beta", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { error?: string; testers?: BetaTester[] };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.testers ?? [];
}

/** Add or remove beta testers: free, unlimited plans until removed. */
export default function BetaManager({ initial }: { initial: BetaTester[] }) {
  const router = useRouter();
  const [testers, setTesters] = useState(initial);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<BetaTester[]>) {
    setBusy(true);
    setError(null);
    try {
      setTesters(await fn());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const list = await call("POST", { email, note: note || undefined });
            setEmail("");
            setNote("");
            return list;
          });
        }}
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}
      >
        <input aria-label="Tester email" type="email" required placeholder="tester@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...input, flex: "2 1 220px" }} />
        <input aria-label="Note (optional)" placeholder="Note, e.g. 'Mom' or 'Reddit beta'" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} style={{ ...input, flex: "1 1 160px" }} />
        <button type="submit" disabled={busy} style={btn}>
          <UserPlus size={15} aria-hidden="true" /> Add tester
        </button>
      </form>
      {error && <p role="alert" style={{ color: "var(--color-error-text)", fontSize: "0.8125rem", margin: "0 0 0.5rem" }}>{error}</p>}
      {testers.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: 0 }}>No beta testers yet. Anyone you add gets free, unlimited plans (up to the daily safety cap) until you remove them.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {testers.map((t) => (
            <li key={t.email} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-input)", background: "var(--color-bg)" }}>
              <Sparkles size={14} aria-hidden="true" style={{ color: "var(--color-accent)", flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{t.email}</span>
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  {t.note ? `${t.note} · ` : ""}added {new Date(t.addedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </span>
              <button type="button" disabled={busy} aria-label={`Remove ${t.email}`} onClick={() => confirm(`Remove ${t.email} from beta? Their next plan will follow normal pricing.`) && void run(() => call("DELETE", { email: t.email }))} style={{ ...iconBtn }}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One-tap "make this traveller a beta tester" from the users table. */
export function MakeBetaButton({ email }: { email: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  return (
    <button
      type="button"
      disabled={state !== "idle"}
      onClick={async () => {
        setState("busy");
        try {
          await call("POST", { email, note: "Added from travellers list" });
          setState("done");
          router.refresh();
        } catch {
          setState("idle");
        }
      }}
      style={{ ...btn, minHeight: 32, padding: "0 0.625rem", fontSize: "0.75rem", background: "transparent", color: "var(--color-brand)", border: "1px solid var(--color-border)" }}
    >
      {state === "done" ? "Added" : "Make beta"}
    </button>
  );
}

const input: React.CSSProperties = { minHeight: 44, padding: "0 0.875rem", borderRadius: "var(--radius-input)", border: "1px solid var(--color-border)", background: "var(--color-bg-input)", color: "var(--color-text)", fontSize: "0.875rem", minWidth: 0 };
const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", minHeight: 44, padding: "0 1rem", borderRadius: "var(--radius-chip)", border: "none", background: "var(--color-brand)", color: "var(--color-text-inverse)", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", whiteSpace: "nowrap" };
const iconBtn: React.CSSProperties = { width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", flexShrink: 0 };
