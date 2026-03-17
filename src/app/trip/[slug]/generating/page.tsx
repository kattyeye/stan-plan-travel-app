"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const MESSAGES = [
  "Building your itinerary…",
  "Finding the best local spots…",
  "Scaling recipes for your group…",
  "Curating restaurant recommendations…",
  "Putting together your packing list…",
  "Adding local tips and day trips…",
  "Finalizing your grocery list…",
  "Almost done — polishing the details…",
];

const POLL_INTERVAL_MS = 5000;

export default function GeneratingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [devError, setDevError] = useState<string | null>(null); // raw error for debugging
  const generateFiredRef = useRef(false);

  // Rotate messages
  useEffect(() => {
    const id = setInterval(() => setMessageIndex((i) => (i + 1) % MESSAGES.length), 4000);
    return () => clearInterval(id);
  }, []);

  // On mount: check status — if pending, fire generation
  useEffect(() => {
    if (!slug || generateFiredRef.current) return;

    async function kickOff() {
      try {
        const res = await fetch(`/api/trip?slug=${slug}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "pending") {
          generateFiredRef.current = true;
          // Fire generation — this request stays open until Claude finishes
          // Don't await here; polling below will detect when it's ready
          fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wizardData: data.wizardData, slug }),
          }).then(async (r) => {
            if (!r.ok) {
              const body = await r.json().catch(() => ({}));
              setDevError(body.error ?? `HTTP ${r.status}`);
            }
          }).catch((e) => setDevError(String(e)));
        } else if (data.status === "ready") {
          router.replace(`/trip/${slug}`);
        } else if (data.status === "error") {
          setError("Generation failed. Please try again.");
        }
        // generating — polling will handle it
      } catch (e) {
        setDevError(String(e));
      }
    }

    kickOff();
  }, [slug, router]);

  // Poll for status changes
  useEffect(() => {
    if (!slug) return;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/trip?slug=${slug}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "ready") {
          router.replace(`/trip/${slug}`);
        } else if (data.status === "error") {
          setError("We hit an issue generating your plan. Please try again.");
        }
      } catch {
        // network blip — keep polling
      }
    }

    const id = setInterval(checkStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slug, router]);

  if (error) {
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-heading)", marginBottom: "0.75rem" }}>
          Something went wrong
        </h2>
        <p style={{ color: "var(--color-text-muted)", maxWidth: "400px", lineHeight: 1.6, marginBottom: "1rem" }}>
          {error}
        </p>
        <button
          onClick={() => router.push("/wizard")}
          style={{ padding: "0.625rem 1.5rem", borderRadius: "10px", border: "none", background: "var(--color-brand)", color: "var(--color-text-inverse)", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer" }}
        >
          ← Back to wizard
        </button>
        {devError && (
          <pre style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "0.75rem", color: "#b91c1c", maxWidth: "480px", whiteSpace: "pre-wrap", textAlign: "left" }}>
            {devError}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div style={centerStyle}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "50%",
        border: "3px solid var(--color-border)",
        borderTopColor: "var(--color-brand)",
        animation: "spin 0.9s linear infinite",
        marginBottom: "2rem",
      }} />

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--color-heading)", marginBottom: "0.75rem", lineHeight: 1.2 }}>
        Irie is working on it
      </h1>

      <p style={{ color: "var(--color-text-muted)", fontSize: "1.0625rem", minHeight: "1.5em", marginBottom: "3rem" }}>
        {MESSAGES[messageIndex]}
      </p>

      <p style={{ color: "var(--color-text-faint)", fontSize: "0.875rem", maxWidth: "340px", lineHeight: 1.6 }}>
        This usually takes 1–2 minutes.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--color-bg)",
  padding: "2rem",
  textAlign: "center",
};
