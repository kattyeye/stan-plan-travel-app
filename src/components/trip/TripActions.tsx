"use client";
import { useState } from "react";
import { Check, Download, Printer, Share2 } from "lucide-react";
import s from "./trip.module.css";

/** Share (the main action — everyone with the link sees the same plan), download, print. Sized for thumbs. */
export default function TripActions({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/trip/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Our trip plan: ${title}`, url });
        return;
      } catch {
        /* cancelled — fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link to share your plan:", url);
    }
  }

  return (
    <div className="no-print" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <button type="button" onClick={share} style={primary}>
        {copied ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Link copied" : "Share with the group"}</span>
      </button>
      <a href={`/api/trip/${slug}/download`} style={btn} download>
        <Download size={15} aria-hidden="true" /> Save offline
      </a>
      <button type="button" onClick={() => window.print()} style={btn} className={s.hidePhone}>
        <Printer size={15} aria-hidden="true" /> Print
      </button>
    </div>
  );
}

const btn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "0.375rem", minHeight: 44,
  padding: "0.5rem 0.95rem", borderRadius: "var(--radius-chip)", border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(0,0,0,0.28)", backdropFilter: "blur(8px)", color: "var(--color-header-text)",
  fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none",
};

const primary: React.CSSProperties = {
  ...btn,
  minHeight: 44,
  background: "var(--color-header-text)",
  color: "var(--color-header-bg)",
  border: "1px solid var(--color-header-text)",
  fontWeight: 700,
};
