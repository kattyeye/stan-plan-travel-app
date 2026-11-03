"use client";
import { useCallback, useEffect, useState } from "react";

interface TripRow {
  slug: string;
  tripNickname: string;
  email: string;
  status: string;
  billing: string | null;
  partner: { partnerId: string; externalRef?: string } | null;
  createdAt: string;
  progress: { stage: string; message: string; percent: number } | null;
  errorMessage: string | null;
  destination?: string;
  startDate?: string;
  endDate?: string;
  quality: { venues: { total: number; verified: number; webSourced: number; unverified: number; removedClosed: number }; issues: number; errors: number } | null;
}

interface Detail {
  trip: { generatedData?: { quality?: { issues: { severity: string; message: string }[] } } };
  pipeline: { stagesDone: string[]; attempts: Record<string, number>; usage: Record<string, number>; models: string[]; lastError: string | null } | null;
}

const TOKEN_KEY = "irie_admin_token";

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ready: { background: "var(--color-success-bg)", color: "var(--color-success-text)" },
  error: { background: "var(--color-error-bg)", color: "var(--color-error-text)" },
  generating: { background: "var(--color-bg-selected)", color: "var(--color-brand)" },
  paid: { background: "var(--color-bg-selected)", color: "var(--color-brand)" },
  pending: { background: "var(--color-warning-bg)", color: "var(--color-warning-text)" },
};

export default function AdminTripsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [newPartner, setNewPartner] = useState<{ name: string; billing: "guest" | "partner"; webhookUrl: string }>({ name: "", billing: "guest", webhookUrl: "" });
  const [partnerResult, setPartnerResult] = useState<string | null>(null);

  useEffect(() => {
    try {
      setToken(sessionStorage.getItem(TOKEN_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json;
    },
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/admin/trips?limit=100");
      setTrips(data.trips);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [api, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function regenerate(slug: string) {
    if (!confirm("Rebuild this trip from scratch? This runs fresh research and costs another generation.")) return;
    setBusy((b) => ({ ...b, [slug]: true }));
    try {
      await api(`/api/admin/trips/${slug}/regenerate`, { method: "POST" });
      window.open(`/trip/${slug}/generating`, "_blank");
      await load();
    } catch (e) {
      alert(`Regenerate failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy((b) => ({ ...b, [slug]: false }));
    }
  }

  async function toggleDetail(slug: string) {
    if (details[slug]) {
      setDetails((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== slug)));
      return;
    }
    try {
      const d = (await api(`/api/admin/trips/${slug}`)) as Detail;
      setDetails((prev) => ({ ...prev, [slug]: d }));
    } catch (e) {
      alert(String(e));
    }
  }

  async function createPartner(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = { name: newPartner.name, billing: newPartner.billing, ...(newPartner.webhookUrl ? { webhookUrl: newPartner.webhookUrl } : {}) };
      const res = await api("/api/admin/partners", { method: "POST", body: JSON.stringify(body) });
      setPartnerResult(
        `Partner ${res.partner.id} created.\nAPI key (shown once): ${res.apiKey}${res.partner.webhookSecret ? `\nWebhook secret (shown once): ${res.partner.webhookSecret}` : ""}`
      );
      setNewPartner({ name: "", billing: "guest", webhookUrl: "" });
    } catch (err) {
      setPartnerResult(`Failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (!token) {
    return (
      <Page>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(TOKEN_KEY, tokenInput);
            setToken(tokenInput);
          }}
          style={{ ...card, maxWidth: 420 }}
        >
          <h1 style={h1}>Admin sign-in</h1>
          <label htmlFor="admin-token" style={{ display: "block", fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
            Admin token (the ADMIN_TOKEN environment variable)
          </label>
          <input id="admin-token" type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} autoComplete="current-password" style={input} />
          <button type="submit" style={{ ...btn, marginTop: "0.75rem" }} disabled={!tokenInput}>Sign in</button>
        </form>
      </Page>
    );
  }

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <h1 style={h1}>Trips ({total})</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" onClick={load} style={btnGhost}>{loading ? "Loading…" : "↻ Refresh"}</button>
          <button type="button" onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken(null); }} style={btnGhost}>Sign out</button>
        </div>
      </div>

      {error && <p role="alert" style={{ color: "var(--color-error-text)" }}>Error: {error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {trips.map((t) => (
          <div key={t.slug} style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ ...pill, ...(STATUS_STYLE[t.status] ?? {}) }}>{t.status}</span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{t.tripNickname || t.destination || t.slug}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                  {t.destination} · {t.startDate} → {t.endDate} · {t.email || "(no email)"} · <code>{t.slug}</code>
                  {t.billing && <> · {t.billing}</>}
                  {t.partner && <> · partner {t.partner.partnerId}{t.partner.externalRef ? ` (${t.partner.externalRef})` : ""}</>}
                </div>
                <div style={{ color: "var(--color-text-faint)", fontSize: "0.75rem" }}>
                  {new Date(t.createdAt).toLocaleString()}
                  {t.progress && t.status !== "ready" && <> · {t.progress.stage} {t.progress.percent}% — {t.progress.message}</>}
                </div>
                {t.quality && (
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                    Venues: {t.quality.venues.verified}/{t.quality.venues.total} verified · {t.quality.venues.webSourced} web · {t.quality.venues.unverified} unverified · {t.quality.venues.removedClosed} removed closed · {t.quality.issues} issues
                    {t.quality.errors > 0 && <strong style={{ color: "var(--color-error-text)" }}> · {t.quality.errors} errors</strong>}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {t.status === "ready" && <a href={`/trip/${t.slug}`} target="_blank" rel="noreferrer" style={btn}>View</a>}
                <button type="button" onClick={() => toggleDetail(t.slug)} style={btnGhost}>{details[t.slug] ? "Hide" : "Details"}</button>
                <button type="button" onClick={() => regenerate(t.slug)} disabled={busy[t.slug]} style={btnGhost}>{busy[t.slug] ? "Starting…" : "Regenerate"}</button>
              </div>
            </div>
            {details[t.slug] && (
              <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
                {details[t.slug].pipeline ? (
                  <p style={{ margin: "0 0 0.5rem" }}>
                    Stages done: {details[t.slug].pipeline!.stagesDone.join(", ") || "none"} · attempts {JSON.stringify(details[t.slug].pipeline!.attempts)} · tokens in/out{" "}
                    {details[t.slug].pipeline!.usage?.inputTokens}/{details[t.slug].pipeline!.usage?.outputTokens} · searches {details[t.slug].pipeline!.usage?.webSearches} · models {[...new Set(details[t.slug].pipeline!.models)].join(", ")}
                    {details[t.slug].pipeline!.lastError && <><br /><strong style={{ color: "var(--color-error-text)" }}>Last error: {details[t.slug].pipeline!.lastError}</strong></>}
                  </p>
                ) : (
                  <p style={{ margin: "0 0 0.5rem" }}>No pipeline checkpoint (legacy trip or expired).</p>
                )}
                <ul style={{ margin: 0, paddingLeft: "1.125rem" }}>
                  {(details[t.slug].trip.generatedData?.quality?.issues ?? []).map((i, k) => (
                    <li key={k} style={{ color: i.severity === "error" ? "var(--color-error-text)" : i.severity === "warning" ? "var(--color-warning-text)" : "var(--color-text-muted)" }}>
                      [{i.severity}] {i.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={createPartner} style={{ ...card, marginTop: "2rem" }}>
        <h2 style={{ ...h1, fontSize: "1.125rem" }}>Create partner API key</h2>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <input aria-label="Partner name" placeholder="Partner name" value={newPartner.name} onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })} style={input} />
          <select aria-label="Billing" value={newPartner.billing} onChange={(e) => setNewPartner({ ...newPartner, billing: e.target.value as "guest" | "partner" })} style={input}>
            <option value="guest">Guest pays (prefill links)</option>
            <option value="partner">Partner pays (generate now)</option>
          </select>
          <input aria-label="Webhook URL" placeholder="https://partner.example/webhooks/irie (optional)" value={newPartner.webhookUrl} onChange={(e) => setNewPartner({ ...newPartner, webhookUrl: e.target.value })} style={input} />
        </div>
        <button type="submit" style={{ ...btn, marginTop: "0.75rem" }} disabled={newPartner.name.trim().length < 2}>Create</button>
        {partnerResult && <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8125rem", marginTop: "0.75rem", color: "var(--color-text)" }}>{partnerResult}</pre>}
      </form>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginBottom: "0.5rem" }}>/admin/trips — internal use only</p>
        {children}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "1rem 1.25rem" };
const h1: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: "1.375rem", fontWeight: 700, color: "var(--color-text)", margin: "0 0 0.75rem" };
const pill: React.CSSProperties = { padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0 };
const btn: React.CSSProperties = { padding: "0.4rem 0.9rem", borderRadius: "6px", border: "none", background: "var(--color-brand)", color: "var(--color-text-inverse)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { ...btn, background: "transparent", color: "var(--color-brand)", border: "1px solid var(--color-border)" };
const input: React.CSSProperties = { width: "100%", padding: "0.55rem 0.75rem", borderRadius: "var(--radius-input)", border: "1px solid var(--color-border)", background: "var(--color-bg-input)", color: "var(--color-text)", fontSize: "0.875rem" };
