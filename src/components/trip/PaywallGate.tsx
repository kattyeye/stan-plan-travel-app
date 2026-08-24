"use client";
import Link from "next/link";
import { Lock } from "lucide-react";

interface Props {
  destination: string;
}

export default function PaywallGate({ destination }: Props) {
  return (
    <div style={{ position: "relative" }}>
      {/* Fade mask — sits above the content below this component */}
      <div style={{
        position: "absolute",
        top: "-180px",
        left: 0,
        right: 0,
        height: "180px",
        background: "linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%)",
        pointerEvents: "none",
        zIndex: 2,
      }} />

      {/* Gate card */}
      <div style={{
        position: "relative",
        zIndex: 3,
        maxWidth: "560px",
        margin: "0 auto",
        textAlign: "center",
        padding: "3rem 2rem 3.5rem",
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "20px",
        boxShadow: "var(--shadow-float)",
      }}>
        {/* Lock icon */}
        <div style={{
          width: 52, height: 52,
          borderRadius: "50%",
          background: "var(--color-brand-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.25rem",
        }}>
          <Lock size={22} style={{ color: "var(--color-brand)" }} />
        </div>

        {/* Heading */}
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.625rem",
          color: "var(--color-heading)",
          marginBottom: "0.625rem",
          lineHeight: 1.2,
        }}>
          You&apos;ve seen Day 1.
        </h2>
        <p style={{
          color: "var(--color-text-muted)",
          fontSize: "1rem",
          lineHeight: 1.65,
          marginBottom: "0.375rem",
        }}>
          The full {destination} plan includes {" "}
          <strong style={{ color: "var(--color-text)" }}>5 days of itinerary</strong>,
          restaurant picks with verified hours, recipes scaled to your group,
          a grocery list, packing list, and more.
        </p>
        <p style={{
          color: "var(--color-text-muted)",
          fontSize: "0.9375rem",
          marginBottom: "2rem",
        }}>
          Build your own personalized version in minutes.
        </p>

        {/* What's locked — teaser list */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginBottom: "2rem",
          textAlign: "left",
        }}>
          {[
            "Days 2–5 of the full itinerary",
            "All restaurant recommendations + verified hours",
            "Cook-in recipes scaled to your group size",
            "Complete grocery list by meal",
            "Packing list tailored to your trip type",
            "Printable PDF + shareable link for your group",
          ].map((item) => (
            <div key={item} style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              fontSize: "0.875rem", color: "var(--color-text-muted)",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--color-brand-light)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.55rem", fontWeight: 700,
                color: "var(--color-brand)",
                flexShrink: 0,
              }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href="/wizard" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.875rem 1.5rem",
            background: "var(--color-brand)",
            color: "var(--color-text-inverse)",
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
          }}>
            Build my {destination} plan →
          </Link>
          <Link href="/" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.75rem 1.5rem",
            background: "transparent",
            color: "var(--color-text-muted)",
            borderRadius: "999px",
            fontWeight: 500,
            fontSize: "0.9375rem",
            textDecoration: "none",
            border: "1px solid var(--color-border)",
          }}>
            See how it works first
          </Link>
        </div>

        {/* Social proof strip */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.625rem",
          marginTop: "1.5rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--color-border)",
        }}>
          <div style={{ display: "flex" }}>
            {[
              "https://i.pravatar.cc/48?img=47",
              "https://i.pravatar.cc/48?img=12",
              "https://i.pravatar.cc/48?img=5",
            ].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" style={{
                width: 24, height: 24,
                borderRadius: "50%",
                border: "2px solid var(--color-bg-card)",
                marginLeft: i === 0 ? 0 : -7,
                objectFit: "cover",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.1rem" }}>
            {[1,2,3,4,5].map((s) => (
              <span key={s} style={{ color: "var(--color-accent)", fontSize: "0.6875rem" }}>★</span>
            ))}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>
            10,000+ trips planned · No account needed
          </p>
        </div>
      </div>
    </div>
  );
}
