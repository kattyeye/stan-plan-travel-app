"use client";
import { useEffect, useRef, useState } from "react";
import type { DayCount } from "@/lib/admin-stats";

const H = 180;
const PAD = { top: 12, right: 8, bottom: 26, left: 28 };

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Trips started per day — one series (no legend; the title names it), thin
 * bars with rounded data-ends on the baseline and a 2px gap. The paid / free /
 * beta / partner split is in the hover tooltip and the table, never in colour.
 */
export default function TripsChart({ days }: { days: DayCount[] }) {
  const [active, setActive] = useState<number | null>(null);
  // Drawn at the container's real width, so labels stay 10–11px on phones and laptops alike.
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = Math.max(1, ...days.map((d) => d.total));
  const step = Math.max(1, Math.ceil(max / 3));
  const ticks = [0, step, step * 2, step * 3].filter((v) => v <= Math.max(max, step));
  const top = ticks[ticks.length - 1];
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / days.length;
  const barW = Math.max(4, Math.min(28, slot - 2));
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const a = active !== null ? days[active] : null;

  return (
    <figure ref={box} style={{ margin: 0, position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Trips started per day, last ${days.length} days`} style={{ width: "100%", height: H, display: "block", overflow: "visible" }} onMouseLeave={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={t === 0 ? 1 : 0.75} strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-text-faint)">{t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const h = Math.max(0, y(0) - y(d.total));
          const r = Math.min(4, barW / 2, h);
          const path = h > 0 ? `M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barW - r} Q${x + barW},${y(0) - h} ${x + barW},${y(0) - h + r} V${y(0)} Z` : "";
          const label = `${fmtDay(d.date)}: ${d.total} trip${d.total === 1 ? "" : "s"} — ${d.stripe} paid, ${d.free} free, ${d.comp} beta, ${d.partner} partner`;
          return (
            <g key={d.date} tabIndex={0} role="img" aria-label={label} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} style={{ outline: "none" }}>
              {/* Hit target bigger than the mark */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" />
              {path && <path d={path} fill="var(--color-brand)" opacity={active === null || active === i ? 1 : 0.45} />}
              {(i === 0 || i === days.length - 1 || i === Math.floor(days.length / 2)) && (
                <text x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--color-text-faint)">{fmtDay(d.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {a && (
        <div role="status" style={{ position: "absolute", top: 0, right: 0, background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-input)", boxShadow: "var(--shadow-float)", padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "var(--color-text)", pointerEvents: "none" }}>
          <strong>{fmtDay(a.date)} · {a.total} trip{a.total === 1 ? "" : "s"}</strong>
          <div style={{ color: "var(--color-text-muted)" }}>{a.stripe} paid · {a.free} free · {a.comp} beta · {a.partner} partner</div>
        </div>
      )}
      <details style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
        <summary style={{ cursor: "pointer", minHeight: 32 }}>Show as table</summary>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.375rem" }}>
          <thead>
            <tr>{["Day", "Total", "Paid", "Free", "Beta", "Partner"].map((h) => <th key={h} style={{ textAlign: h === "Day" ? "left" : "right", padding: "0.25rem 0.375rem", borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.date}>
                <td style={{ padding: "0.25rem 0.375rem" }}>{fmtDay(d.date)}</td>
                {[d.total, d.stripe, d.free, d.comp, d.partner].map((v, i) => <td key={i} style={{ textAlign: "right", padding: "0.25rem 0.375rem" }}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
