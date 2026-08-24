"use client";
import { useEffect, useState } from "react";

interface Referral {
  code: string;
  total: number;
  converted: number;
  lastSeen: string;
  destinations: string[];
}

const cell: React.CSSProperties = {
  padding: "0.75rem 0.875rem",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "0.875rem",
  textAlign: "left",
};

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [unattributed, setUnattributed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/referrals")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReferrals(data.referrals ?? []);
        setUnattributed(data.unattributed ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: "820px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.875rem", marginBottom: "0.375rem" }}>
        Creator referrals
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
        Creators share <code>?ref=theirhandle</code>. Codes stick for 30 days and are
        recorded on the trip and in Stripe metadata. &quot;Converted&quot; counts trips that
        reached payment — that&apos;s the payable number.
      </p>

      {loading && <p style={{ color: "var(--color-text-muted)" }}>Loading…</p>}
      {error && (
        <p role="alert" style={{ color: "var(--color-error-text)", background: "var(--color-error-bg)", border: "1px solid var(--color-error-border)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
          {error}
        </p>
      )}

      {!loading && !error && referrals.length === 0 && (
        <p style={{ color: "var(--color-text-muted)" }}>
          No referred trips yet. Share a link like{" "}
          <code>https://your-domain/?ref=testcreator</code> to try it.
        </p>
      )}

      {referrals.length > 0 && (
        <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", background: "var(--color-bg-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "34rem" }}>
            <thead>
              <tr>
                <th style={{ ...cell, fontWeight: 700 }}>Code</th>
                <th style={{ ...cell, fontWeight: 700 }}>Converted</th>
                <th style={{ ...cell, fontWeight: 700 }}>Total</th>
                <th style={{ ...cell, fontWeight: 700 }}>Destinations</th>
                <th style={{ ...cell, fontWeight: 700 }}>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.code}>
                  <td style={{ ...cell, fontWeight: 600 }}>{r.code}</td>
                  <td style={{ ...cell, fontWeight: 700, color: "var(--color-brand)" }}>{r.converted}</td>
                  <td style={cell}>{r.total}</td>
                  <td style={{ ...cell, color: "var(--color-text-muted)" }}>{r.destinations.join(", ") || "—"}</td>
                  <td style={{ ...cell, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                    {new Date(r.lastSeen).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <p style={{ color: "var(--color-text-faint)", fontSize: "0.8125rem", marginTop: "1rem" }}>
          {unattributed} trip{unattributed === 1 ? "" : "s"} with no referral code.
        </p>
      )}
    </main>
  );
}
