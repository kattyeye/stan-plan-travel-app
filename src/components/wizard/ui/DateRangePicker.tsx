"use client";
import { useState, useRef, useEffect } from "react";

interface Props {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYMD(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDisplay(start: string, end: string) {
  const s = parseYMD(start);
  const e = parseYMD(end);
  if (!s && !e) return "";
  const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
  if (s && !e) return fmt(s) + " →";
  if (s && e) return `${fmt(s)} – ${fmt(e)}`;
  return "";
}

export default function DateRangePicker({ startDate, endDate, onChange }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  // Show two months: current view month + next
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  // Selecting state: null = pick start, "start" = picked start, waiting for end
  const [picking, setPicking] = useState<"start" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPicking(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleDayClick(ymd: string) {
    const clicked = parseYMD(ymd)!;
    if (clicked < today) return; // no past dates

    if (picking === null || (startDate && endDate)) {
      // Start fresh selection
      onChange(ymd, "");
      setPicking("start");
    } else {
      // picking === "start" — set end
      const start = parseYMD(startDate)!;
      if (clicked < start) {
        // Clicked before start — swap
        onChange(ymd, startDate);
      } else if (isSameDay(clicked, start)) {
        // Same day — deselect
        onChange("", "");
      } else {
        onChange(startDate, ymd);
      }
      setPicking(null);
      setOpen(false);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build the two months to display
  const months = [
    { year: viewYear, month: viewMonth },
    viewMonth === 11 ? { year: viewYear + 1, month: 0 } : { year: viewYear, month: viewMonth + 1 },
  ];

  const start = parseYMD(startDate);
  const end = parseYMD(endDate);
  const hoveredDate = hovered ? parseYMD(hovered) : null;

  function getDayState(ymd: string) {
    const d = parseYMD(ymd)!;
    const isStart = start && isSameDay(d, start);
    const isEnd = end && isSameDay(d, end);
    const isPast = d < today;

    // Range highlight: between start and (end or hovered)
    const rangeEnd = (picking === "start" && hoveredDate && start) ? hoveredDate : end;
    const inRange = start && rangeEnd && d > start && d < rangeEnd;

    return { isStart, isEnd, inRange, isPast };
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        aria-label={startDate ? `Travel dates: ${formatDisplay(startDate, endDate)}. Press to change` : "Select travel dates"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => { setOpen(v => !v); if (!open) setPicking(startDate && !endDate ? "start" : null); }}
        style={{
          width: "100%",
          padding: "0.625rem 0.875rem",
          borderRadius: "10px",
          border: `1px solid ${open ? "var(--color-border-focus)" : "var(--color-border)"}`,
          background: "var(--color-bg-input)",
          color: startDate ? "var(--color-text)" : "var(--color-text-faint)",
          fontSize: "0.9375rem",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <span>{startDate ? formatDisplay(startDate, endDate) : "Select travel dates"}</span>
        <span style={{ opacity: 0.5 }}>📅</span>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          zIndex: 50,
          background: "var(--color-bg-input)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          boxShadow: "0 8px 32px rgba(21,24,12,0.12)",
          padding: "1.25rem",
          minWidth: "min(640px, 90vw)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <button type="button" aria-label="Previous month" onClick={prevMonth} style={navBtnStyle}><span aria-hidden="true">‹</span></button>
            <span style={{ color: "var(--color-text)", fontWeight: 600, fontSize: "0.9375rem" }}>
              {MONTHS[months[0].month]} {months[0].year} – {MONTHS[months[1].month]} {months[1].year}
            </span>
            <button type="button" aria-label="Next month" onClick={nextMonth} style={navBtnStyle}><span aria-hidden="true">›</span></button>
          </div>

          {/* Two-month grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {months.map(({ year, month }) => (
              <MonthGrid
                key={`${year}-${month}`}
                year={year}
                month={month}
                today={today}
                getDayState={getDayState}
                onDayClick={handleDayClick}
                onDayHover={setHovered}
              />
            ))}
          </div>

          {/* Footer hint */}
          <p aria-live="polite" aria-atomic="true" style={{ marginTop: "0.875rem", color: "var(--color-text-faint)", fontSize: "0.8125rem", textAlign: "center" }}>
            {!startDate ? "Click your arrival date" : !endDate ? "Now click your departure date" : `${endDate ? `${Math.round((parseYMD(endDate)!.getTime() - parseYMD(startDate)!.getTime()) / 86400000)} nights selected` : ""}`}
          </p>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: "2rem", height: "2rem",
  borderRadius: "50%",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text-muted)",
  fontSize: "1.125rem",
  cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1,
};

interface MonthGridProps {
  year: number;
  month: number;
  today: Date;
  getDayState: (ymd: string) => { isStart: boolean | null; isEnd: boolean | null; inRange: boolean | null; isPast: boolean };
  onDayClick: (ymd: string) => void;
  onDayHover: (ymd: string | null) => void;
}

function MonthGrid({ year, month, today, getDayState, onDayClick, onDayHover }: MonthGridProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return toYMD(d);
    }),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <p style={{ fontWeight: 600, color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "0.625rem" }}>
        {MONTHS[month]} {year}
      </p>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-text-faint)", padding: "0.25rem 0" }}>{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={i} />;
          const { isStart, isEnd, inRange, isPast } = getDayState(ymd);
          const isToday = isSameDay(parseYMD(ymd)!, today);

          let bg = "transparent";
          let color = isPast ? "var(--color-brand-disabled)" : "var(--color-text)";
          let borderRadius = "7px";
          let fontWeight: React.CSSProperties["fontWeight"] = 400;

          if (isStart || isEnd) {
            bg = "var(--color-brand)";
            color = "var(--color-text-inverse)";
            fontWeight = 700;
          } else if (inRange) {
            bg = "var(--color-bg-selected)";
            color = "var(--color-text)";
            borderRadius = "0";
          }

          if (isStart) borderRadius = "7px 0 0 7px";
          if (isEnd) borderRadius = "0 7px 7px 0";
          if (isStart && isEnd) borderRadius = "7px";

          const dayDate = new Date(year, month, parseInt(ymd.split("-")[2]));
          const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
          const stateLabel = isStart ? " (selected start)" : isEnd ? " (selected end)" : inRange ? " (in range)" : isPast ? " (unavailable)" : "";

          return (
            <button
              key={ymd}
              type="button"
              disabled={isPast}
              aria-label={`${dayLabel}${stateLabel}`}
              aria-disabled={isPast}
              aria-pressed={!!(isStart || isEnd)}
              onClick={() => onDayClick(ymd)}
              onMouseEnter={() => onDayHover(ymd)}
              onMouseLeave={() => onDayHover(null)}
              style={{
                padding: "0.375rem 0",
                background: bg,
                color,
                border: isToday && !isStart && !isEnd ? "1px solid var(--color-text-faint)" : "1px solid transparent",
                borderRadius,
                fontSize: "0.8125rem",
                fontWeight,
                cursor: isPast ? "default" : "pointer",
                textAlign: "center",
                transition: "background 0.1s",
                opacity: isPast ? 0.4 : 1,
              }}
            >
              {dayDate.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
