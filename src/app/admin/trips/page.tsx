"use client";
import { useEffect, useState } from "react";

interface Trip {
  slug: string;
  tripNickname: string;
  email: string;
  status: string;
  createdAt: string;
  wizardData?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    nights?: number;
  };
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#92400e",
  generating: "#1e40af",
  ready: "#166534",
  error: "#991b1b",
  paid: "#5b21b6",
};

const STATUS_BG: Record<string, string> = {
  pending: "#fef3c7",
  generating: "#dbeafe",
  ready: "#dcfce7",
  error: "#fee2e2",
  paid: "#ede9fe",
};

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});

  async function loadTrips() {
    try {
      const res = await fetch("/api/admin/trips");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTrips(data.trips);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTrips(); }, []);

  async function regenerate(trip: Trip) {
    setRegenerating((r) => ({ ...r, [trip.slug]: true }));
    try {
      // Fetch full trip data (includes wizardData)
      const tripRes = await fetch(`/api/trip?slug=${trip.slug}`);
      const tripData = await tripRes.json();

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wizardData: tripData.wizardData, slug: trip.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      // Refresh list
      await loadTrips();
      window.open(`/trip/${trip.slug}`, "_blank");
    } catch (e) {
      alert(`Regeneration failed: ${String(e)}`);
    } finally {
      setRegenerating((r) => ({ ...r, [trip.slug]: false }));
    }
  }

  if (loading) return <Page><p style={{ color: "#6b7280" }}>Loading trips…</p></Page>;
  if (error) return <Page><p style={{ color: "#991b1b" }}>Error: {error}</p></Page>;

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
          All Trips ({trips.length})
        </h1>
        <button onClick={loadTrips} style={btnStyle("#6b7280")}>↻ Refresh</button>
      </div>

      {trips.length === 0 && (
        <p style={{ color: "#6b7280" }}>No trips yet.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {trips.map((trip) => (
          <div key={trip.slug} style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}>
            {/* Status badge */}
            <span style={{
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              background: STATUS_BG[trip.status] ?? "#f3f4f6",
              color: STATUS_COLOR[trip.status] ?? "#374151",
              flexShrink: 0,
            }}>
              {trip.status}
            </span>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.9375rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {trip.tripNickname || trip.wizardData?.destination || trip.slug}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.8125rem", marginTop: "0.125rem" }}>
                {trip.wizardData?.destination && <span>{trip.wizardData.destination} · </span>}
                {trip.wizardData?.startDate && <span>{trip.wizardData.startDate} → {trip.wizardData.endDate} · </span>}
                {trip.email} · <code style={{ fontSize: "0.75rem" }}>{trip.slug}</code>
              </div>
              <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.125rem" }}>
                {new Date(trip.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              {trip.status === "ready" && (
                <a href={`/trip/${trip.slug}`} target="_blank" style={btnStyle("#166534")}>
                  View →
                </a>
              )}
              <a href={`/trip/${trip.slug}/generating`} target="_blank" style={btnStyle("#1e40af")}>
                Status
              </a>
              <button
                onClick={() => regenerate(trip)}
                disabled={regenerating[trip.slug]}
                style={btnStyle(regenerating[trip.slug] ? "#9ca3af" : "#7c3aed")}
              >
                {regenerating[trip.slug] ? "Running…" : "Regenerate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.5rem" }}>
          /admin/trips — internal use only
        </p>
        {children}
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "0.375rem 0.875rem",
    borderRadius: "6px",
    border: "none",
    background: bg,
    color: "#fff",
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  };
}
