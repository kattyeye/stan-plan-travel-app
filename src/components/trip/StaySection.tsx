import { buildStayLinks, type StaySearch } from "@/core/partners";
import { getAffiliateConfig } from "@/lib/affiliates";
import { Home, ExternalLink } from "lucide-react";

interface Props {
  search: StaySearch;
}

/**
 * "Where to stay" — prefilled searches on the major rental sites.
 *
 * Server component so affiliate ids never reach the client bundle.
 */
export default function StaySection({ search }: Props) {
  if (!search.destination) return null;
  const links = buildStayLinks(search, getAffiliateConfig());

  const nights =
    search.checkIn && search.checkOut
      ? Math.round(
          (new Date(`${search.checkOut}T00:00:00Z`).getTime() -
            new Date(`${search.checkIn}T00:00:00Z`).getTime()) /
            86_400_000,
        )
      : null;

  const guests = search.adults + (search.children ?? 0);
  const summary = [
    search.destination,
    nights && nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : null,
    `${guests} guest${guests === 1 ? "" : "s"}`,
    search.bedrooms ? `${search.bedrooms}+ bedrooms` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-card)",
        padding: "1.5rem",
        marginBottom: "1.25rem",
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.25rem",
          color: "var(--color-heading)",
          marginBottom: "0.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Home size={18} aria-hidden="true" />
        Where to stay
      </h3>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
        {summary} — already filled in for you.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.95rem",
              borderRadius: "var(--radius-input)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text)",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {link.label}
            <ExternalLink size={13} aria-hidden="true" />
            <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              opens in a new tab
            </span>
          </a>
        ))}
      </div>

      <p style={{ color: "var(--color-text-faint)", fontSize: "0.75rem", marginTop: "0.875rem", lineHeight: 1.5 }}>
        {links.some((l) => l.earns)
          ? "Some links earn Irie a commission at no extra cost to you."
          : "We don't earn anything from these — they're just prefilled to save you typing."}
      </p>
    </section>
  );
}
