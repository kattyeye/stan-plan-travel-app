"use client";
import { useEffect, useState } from "react";
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

const POLL_INTERVAL_MS = 4000;

export default function GeneratingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Rotate messages every 4s
  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Poll trip status
  useEffect(() => {
    if (!slug) return;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/trip?slug=${slug}`);
        if (!res.ok) {
          setError("Something went wrong. Please check your email for a link to your plan.");
          return;
        }
        const data = await res.json();

        if (data.status === "ready") {
          router.replace(`/trip/${slug}`);
        } else if (data.status === "error") {
          setError("We hit an issue generating your plan. Our team will follow up by email.");
        }
        // else still generating — keep polling
      } catch {
        // Network blip — keep polling silently
      }
    }

    const id = setInterval(checkStatus, POLL_INTERVAL_MS);
    checkStatus(); // run immediately
    return () => clearInterval(id);
  }, [slug, router]);

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-tea-green-50)",
        padding: "2rem",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-tea-green-950)", marginBottom: "0.75rem" }}>
          Something went wrong
        </h2>
        <p style={{ color: "var(--color-tea-green-700)", maxWidth: "400px", lineHeight: 1.6 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-tea-green-50)",
      padding: "2rem",
      textAlign: "center",
    }}>
      {/* Spinner */}
      <div style={{
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        border: "3px solid var(--color-tea-green-200)",
        borderTopColor: "var(--color-tea-green-600)",
        animation: "spin 0.9s linear infinite",
        marginBottom: "2rem",
      }} />

      <h1 style={{
        fontFamily: "var(--font-display)",
        fontSize: "2rem",
        color: "var(--color-tea-green-950)",
        marginBottom: "0.75rem",
        lineHeight: 1.2,
      }}>
        Stan Plan is working on it
      </h1>

      <p style={{
        color: "var(--color-tea-green-700)",
        fontSize: "1.0625rem",
        minHeight: "1.5em",
        transition: "opacity 0.3s",
        marginBottom: "3rem",
      }}>
        {MESSAGES[messageIndex]}
      </p>

      <p style={{
        color: "var(--color-tea-green-500)",
        fontSize: "0.875rem",
        maxWidth: "340px",
        lineHeight: 1.6,
      }}>
        This usually takes 1–2 minutes. We'll also send the link to your email when it's ready.
      </p>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
