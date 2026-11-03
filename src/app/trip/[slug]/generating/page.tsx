"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import type { TripProgress, TripStatus } from "@/types/trip";

interface StatusResponse {
  status: TripStatus;
  destination: string;
  tripNickname: string;
  progress: TripProgress | null;
  errorMessage: string | null;
}

const STEPS = [
  { key: "research", label: "Researching", detail: "Searching the web for restaurants, activities and events that are open right now" },
  { key: "verify", label: "Verifying", detail: "Confirming each place exists and checking its opening hours" },
  { key: "plan", label: "Planning your days", detail: "Fitting meals and activities around real opening hours and drive times" },
  { key: "recipes", label: "Recipes & lists", detail: "Scaling recipes to your group and building the grocery and packing lists" },
  { key: "finalize", label: "Final checks", detail: "Double-checking dietary needs, dates and references" },
] as const;

function stepIndex(p: TripProgress | null): number {
  if (!p) return 0;
  switch (p.stage) {
    case "queued":
    case "research":
      return p.percent >= 30 ? 1 : 0;
    case "plan":
      return 2;
    case "recipes":
      return 3;
    case "finalize":
      return 4;
    case "done":
      return 5;
  }
}

const POLL_MS = 4000;
const NUDGE_MS = 30_000;

export default function GeneratingPage() {
  return (
    <Suspense fallback={<Center><p style={bodyStyle}>Loading…</p></Center>}>
      <Generating />
    </Suspense>
  );
}

function Generating() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const sessionId = useSearchParams().get("session_id") ?? undefined;

  const [data, setData] = useState<StatusResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [displayPct, setDisplayPct] = useState(3);
  const [now, setNow] = useState(() => Date.now());
  const pendingSince = useRef<number>(0);
  const lastNudge = useRef(0);

  const nudge = useCallback(
    async (retry = false) => {
      lastNudge.current = Date.now();
      try {
        await fetch(`/api/trip/${slug}/resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, retry }),
        });
      } catch {
        /* polling will try again */
      }
    },
    [slug, sessionId]
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/trip?slug=${slug}`, { cache: "no-store" });
      if (res.status === 404) return setNotFound(true);
      if (!res.ok) return;
      const json = (await res.json()) as StatusResponse;
      setData(json);
      if (json.status === "ready") {
        router.replace(`/trip/${slug}`);
        return;
      }
      if (json.status !== "pending" || !pendingSince.current) pendingSince.current = Date.now();
      // Ask the server to make sure work is happening; it decides whether anything needs restarting.
      if (json.status !== "error" && Date.now() - lastNudge.current > NUDGE_MS) void nudge();
    } catch {
      /* network blip — keep polling */
    }
  }, [slug, router, nudge]);

  useEffect(() => {
    void nudge().then(poll);
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [nudge, poll]);

  // Ease the bar toward the next milestone between polls so it never looks frozen.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      const target = data?.progress?.percent ?? 3;
      const ceiling = Math.min(98, target + 18);
      setDisplayPct((p) => (p < target ? target : p < ceiling ? p + 0.25 : p));
    }, 1000);
    return () => clearInterval(id);
  }, [data?.progress?.percent]);

  async function tryAgain() {
    setRetrying(true);
    await nudge(true);
    await poll();
    setRetrying(false);
  }

  if (notFound) {
    return (
      <Center>
        <h1 style={titleStyle}>We can&apos;t find that trip</h1>
        <p style={bodyStyle}>Double-check the link from your confirmation email.</p>
        <a href="/wizard" style={buttonStyle}>Plan a new trip</a>
      </Center>
    );
  }

  if (data?.status === "error") {
    return (
      <Center>
        <h1 style={titleStyle}>We hit a snag</h1>
        <p style={bodyStyle}>{data.errorMessage}</p>
        <button type="button" onClick={tryAgain} disabled={retrying} style={buttonStyle}>
          {retrying ? "Restarting…" : "Try again"}
        </button>
        <p style={{ ...smallStyle, marginTop: "1rem" }}>Your payment is safe, and anything already finished is kept.</p>
      </Center>
    );
  }

  const awaitingPayment = data?.status === "pending";
  // eslint-disable-next-line react-hooks/refs -- read on the 1s render tick driven by `now`
  const waitedLong = pendingSince.current > 0 && now - pendingSince.current > 60_000;
  const current = stepIndex(data?.progress ?? null);
  const started = data?.progress?.startedAt ? Date.parse(data.progress.startedAt) : undefined;
  const elapsed = started ? Math.max(0, Math.floor((now - started) / 1000)) : 0;

  return (
    <Center>
      <p style={eyebrowStyle}>{data?.tripNickname ?? "Your trip"}</p>
      <h1 style={titleStyle}>
        {awaitingPayment ? "Confirming your payment" : `Building your trip to ${data?.destination ?? "…"}`}
      </h1>
      <p aria-live="polite" style={{ ...bodyStyle, minHeight: "1.5em" }}>
        {awaitingPayment
          ? waitedLong
            ? "Still waiting for Stripe to confirm. If you closed the payment page early, you can return to checkout."
            : "This only takes a moment…"
          : data?.progress?.message ?? "Getting started…"}
      </p>

      {!awaitingPayment && (
        <>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(displayPct)}
            aria-label="Trip plan progress"
            style={{ width: "100%", maxWidth: 440, height: 6, borderRadius: 999, background: "var(--color-border)", overflow: "hidden", margin: "0.5rem 0 2rem" }}
          >
            <div style={{ width: `${displayPct}%`, height: "100%", background: "var(--color-brand)", transition: "width 0.9s ease" }} />
          </div>

          <ol style={{ listStyle: "none", padding: 0, margin: 0, width: "100%", maxWidth: 440, textAlign: "left" }}>
            {STEPS.map((step, i) => {
              const state = i < current ? "done" : i === current ? "active" : "todo";
              return (
                <li key={step.key} style={{ display: "flex", gap: "0.875rem", padding: "0.625rem 0", opacity: state === "todo" ? 0.5 : 1 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: state === "done" ? "var(--color-brand)" : "transparent",
                      border: state === "done" ? "none" : "2px solid var(--color-border)",
                      color: "var(--color-text-inverse)",
                    }}
                  >
                    {state === "done" && <Check size={14} />}
                    {state === "active" && <Loader2 size={14} style={{ color: "var(--color-brand)", animation: "spin 1s linear infinite" }} />}
                  </span>
                  <span>
                    <span style={{ display: "block", fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>
                      {step.label}
                      <span className="sr-only">{state === "done" ? " — done" : state === "active" ? " — in progress" : ""}</span>
                    </span>
                    {state === "active" && <span style={{ display: "block", ...smallStyle, marginTop: 2 }}>{step.detail}</span>}
                  </span>
                </li>
              );
            })}
          </ol>

          <p style={{ ...smallStyle, marginTop: "2rem", maxWidth: 380 }}>
            {elapsed > 0 && <>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed · </>}
            Usually 3–5 minutes, because we check every place against live listings. You can close this tab — we&apos;ll email you the link.
          </p>
        </>
      )}

      {awaitingPayment && waitedLong && (
        <a href="/wizard" style={{ ...buttonStyle, background: "transparent", color: "var(--color-brand)", border: "1px solid var(--color-border)" }}>
          Back to the wizard
        </a>
      )}
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
        padding: "3rem 1rem",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

const eyebrowStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: "0.5rem" };
const titleStyle: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: "clamp(1.625rem, 5vw, 2.25rem)", color: "var(--color-heading)", lineHeight: 1.2, margin: "0 0 0.75rem", maxWidth: 560 };
const bodyStyle: React.CSSProperties = { color: "var(--color-text-muted)", fontSize: "1rem", lineHeight: 1.6, maxWidth: 460, margin: "0 0 1.25rem" };
const smallStyle: React.CSSProperties = { color: "var(--color-text-faint)", fontSize: "0.8125rem", lineHeight: 1.5 };
const buttonStyle: React.CSSProperties = {
  display: "inline-block", padding: "0.75rem 1.75rem", borderRadius: "var(--radius-input)", border: "none",
  background: "var(--color-brand)", color: "var(--color-text-inverse)", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", textDecoration: "none",
};
