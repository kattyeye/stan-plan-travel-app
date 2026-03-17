import { GeneratedTrip } from "@/types/trip";
import PrintButton from "./PrintButton";

interface Props { trip: GeneratedTrip }

const STYLE_BADGE: Record<string, string> = {
  structured: "Fully planned",
  balanced: "Balanced",
  flexible: "Go with the flow",
};

export default function TripHeader({ trip }: Props) {
  const { meta, preferences } = trip;
  const badge = preferences ? (STYLE_BADGE[preferences.planningStyle] ?? preferences.planningStyle) : null;

  return (
    <header style={{
      background: "var(--color-tea-green-900)",
      color: "var(--color-tea-green-50)",
      padding: "3rem 1.5rem 2.5rem",
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-tea-green-400)", marginBottom: "0.5rem" }}>
              Irie
            </p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 5vw, 2.75rem)", lineHeight: 1.1, marginBottom: "0.5rem" }}>
              {meta.title}
            </h1>
            <p style={{ color: "var(--color-tea-green-300)", fontSize: "1.0625rem" }}>
              {meta.destination}
            </p>
          </div>
          <PrintButton />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.75rem" }}>
          <MetaPill emoji="📅" label={`${meta.dates.start} – ${meta.dates.end}`} />
          <MetaPill emoji="🌙" label={`${meta.dates.nights} nights`} />
          <MetaPill emoji="👥" label={`${meta.group.totalPeople} people`} />
          {meta.group.kids > 0 && <MetaPill emoji="👶" label={`${meta.group.kids} kids`} />}
          {meta.property && <MetaPill emoji="🏠" label={meta.property} />}
          {badge && <MetaPill
            emoji="✦"
            label={badge}
            style={{ background: "var(--color-tea-green-700)", border: "1px solid var(--color-tea-green-600)" }}
          />}
        </div>
      </div>
    </header>
  );
}

function MetaPill({ emoji, label, style: extraStyle }: { emoji: string; label: string; style?: React.CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.375rem",
      padding: "0.3125rem 0.75rem",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.12)",
      fontSize: "0.875rem",
      color: "var(--color-tea-green-100)",
      ...extraStyle,
    }}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}
