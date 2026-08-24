import { NormalizedTrip } from "@/types/trip";
import PrintButton from "./PrintButton";
import { CalendarDays, Moon, Users, Baby, Home, Sparkles } from "lucide-react";

interface Props {
  trip: NormalizedTrip;
  cityPhoto?: string | null;
  preview?: boolean;
}

const STYLE_BADGE: Record<string, string> = {
  structured: "Minute-by-minute plan",
  balanced: "Balanced itinerary",
  flexible: "Go with the flow",
};

export default function TripHeader({ trip, cityPhoto, preview }: Props) {
  const { meta, preferences } = trip;
  const badge = preferences ? (STYLE_BADGE[preferences.planningStyle] ?? preferences.planningStyle) : null;

  return (
    <header style={{ position: "relative", overflow: "hidden", minHeight: "320px" }}>
      {/* Background: city photo or fallback solid */}
      {cityPhoto ? (
        <img
          src={cityPhoto}
          alt={meta.destination}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      ) : (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "var(--color-tea-green-900)",
        }} />
      )}

      {/* Dark gradient overlay for text legibility */}
      {cityPhoto && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(10,12,6,0.88) 0%, rgba(10,12,6,0.5) 55%, rgba(10,12,6,0.15) 100%)",
        }} />
      )}

      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 1,
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2.75rem 2rem 2.25rem",
      }}>

        {/* Breadcrumb */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{
            fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: cityPhoto ? "rgba(255,255,255,0.6)" : "var(--color-tea-green-400)",
          }}>
            Irie
          </span>
          <span style={{ color: cityPhoto ? "rgba(255,255,255,0.3)" : "var(--color-tea-green-600)", fontSize: "0.75rem" }}>·</span>
          <span style={{
            fontSize: "0.6875rem", fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: cityPhoto ? "rgba(255,255,255,0.45)" : "var(--color-tea-green-500)",
          }}>
            {preview ? "Sample plan" : "Your trip plan"}
          </span>
        </div>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.625rem" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.875rem, 5vw, 3rem)",
            lineHeight: 1.1,
            color: "#ffffff",
            flex: "1 1 auto",
            margin: 0,
            textShadow: cityPhoto ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
          }}>
            {meta.title}
          </h1>
          {!preview && <PrintButton />}
        </div>

        {/* Destination */}
        <p style={{
          color: cityPhoto ? "rgba(255,255,255,0.75)" : "var(--color-tea-green-400)",
          fontSize: "1rem",
          fontWeight: 400,
          marginBottom: "2rem",
          letterSpacing: "0.01em",
          textShadow: cityPhoto ? "0 1px 6px rgba(0,0,0,0.4)" : "none",
        }}>
          {meta.destination}
        </p>

        {/* Meta pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <MetaPill icon={<CalendarDays size={13} />} label={`${meta.dates.start} – ${meta.dates.end}`} photo={!!cityPhoto} />
            <MetaPill icon={<Moon size={13} />} label={`${meta.dates.nights} night${meta.dates.nights !== 1 ? "s" : ""}`} photo={!!cityPhoto} />
            <MetaPill icon={<Users size={13} />} label={`${meta.group.totalPeople} ${meta.group.totalPeople === 1 ? "person" : "people"}`} photo={!!cityPhoto} />
            {meta.group.kids > 0 && (
              <MetaPill icon={<Baby size={13} />} label={`${meta.group.kids} ${meta.group.kids === 1 ? "kid" : "kids"}`} photo={!!cityPhoto} />
            )}
            {badge && <MetaPill icon={<Sparkles size={13} />} label={badge} accent photo={!!cityPhoto} />}
          </div>
          {meta.property && (
            <div>
              <MetaPill icon={<Home size={13} />} label={meta.property} photo={!!cityPhoto} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MetaPill({ icon, label, accent, photo }: { icon: React.ReactNode; label: string; accent?: boolean; photo?: boolean }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.4rem",
      padding: "0.375rem 0.875rem",
      borderRadius: "999px",
      background: photo
        ? (accent ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.38)")
        : (accent ? "rgba(170, 186, 120, 0.18)" : "rgba(255, 255, 255, 0.07)"),
      border: photo
        ? (accent ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.2)")
        : (accent ? "1px solid var(--color-tea-green-500)" : "1px solid rgba(255, 255, 255, 0.13)"),
      backdropFilter: photo ? "blur(8px)" : "none",
      fontSize: "0.8125rem",
      fontWeight: accent ? 600 : 400,
      color: photo ? "#ffffff" : (accent ? "var(--color-tea-green-300)" : "var(--color-tea-green-200)"),
      whiteSpace: "nowrap",
      lineHeight: 1,
    }}>
      <span style={{ opacity: 0.8, display: "flex", alignItems: "center" }}>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
