import { BadgeCheck, Globe, PhoneCall } from "lucide-react";
import type { Verification } from "@/types/trip";

/** Small, honest label for how we know a place is real and open. */
export default function VerifiedBadge({ verification, compact }: { verification?: Verification; compact?: boolean }) {
  if (!verification) return null;
  const checked = new Date(verification.checkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const variants = {
    verified: {
      Icon: BadgeCheck,
      label: "Verified",
      title: `Confirmed open on Google Maps (checked ${checked})`,
      color: "var(--color-success-text)",
      bg: "var(--color-success-bg)",
    },
    "web-sourced": {
      Icon: Globe,
      label: "Web source",
      title: `Found in current web sources but not confirmed on Google Maps (checked ${checked})`,
      color: "var(--color-text-muted)",
      bg: "var(--color-bg-selected)",
    },
    unverified: {
      Icon: PhoneCall,
      label: "Call ahead",
      title: "We couldn't confirm current hours — call before you go",
      color: "var(--color-warning-text)",
      bg: "var(--color-warning-bg)",
    },
    closed: {
      Icon: PhoneCall,
      label: "Closed",
      title: "Listed as closed",
      color: "var(--color-error-text)",
      bg: "var(--color-error-bg)",
    },
  } as const;
  const v = variants[verification.status];
  return (
    <span
      title={v.title}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.25rem",
        padding: compact ? "0.0625rem 0.4375rem" : "0.125rem 0.5rem",
        borderRadius: "var(--radius-chip)", background: v.bg, color: v.color,
        fontSize: "0.6875rem", fontWeight: 600, whiteSpace: "nowrap", lineHeight: 1.4,
      }}
    >
      <v.Icon size={11} aria-hidden="true" />
      {v.label}
      <span className="sr-only">: {v.title}</span>
    </span>
  );
}
