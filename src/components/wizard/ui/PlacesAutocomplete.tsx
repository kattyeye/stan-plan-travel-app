"use client";
import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface Suggestion {
  id: string;
  label: string;
  mainText: string;
  secondaryText: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user picks a suggestion (not on every keystroke). */
  onSelect?: (value: string) => void;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  /** Overrides for the input box (e.g. the larger landing-page variant). */
  inputStyle?: React.CSSProperties;
}

/**
 * Destination search box. Suggestions come from /api/places/autocomplete, so
 * no browser API key is needed; typing a place freely always works too.
 */
export default function PlacesAutocomplete({ value, onChange, onSelect, placeholder = "e.g. Outer Banks, NC", id, ariaLabel, inputStyle }: Props) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<string>("");

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  async function fetchSuggestions(q: string) {
    abortRef.current?.abort();
    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    sessionRef.current ||= crypto.randomUUID();
    setLoading(true);
    try {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}&session=${sessionRef.current}`, { signal: controller.signal });
      const json = (await res.json()) as { suggestions?: Suggestion[] };
      const list = json.suggestions ?? [];
      setSuggestions(list);
      setActive(-1);
      setOpen(list.length > 0);
    } catch {
      /* aborted or offline — free text still works */
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
  }

  function choose(s: Suggestion) {
    onChange(s.label);
    onSelect?.(s.label);
    setSuggestions([]);
    setOpen(false);
    sessionRef.current = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setFocused(true);
          if (suggestions.length) setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          setTimeout(() => setOpen(false), 150); // let a click on a suggestion land first
        }}
        autoComplete="off"
        spellCheck={false}
        maxLength={160}
        style={{
          width: "100%",
          padding: "0.625rem 2.5rem 0.625rem 0.875rem",
          borderRadius: "var(--radius-input)",
          border: `1px solid ${focused ? "var(--color-border-focus)" : "var(--color-border)"}`,
          background: "var(--color-bg-input)",
          color: "var(--color-text)",
          fontSize: "0.9375rem",
          outline: "none",
          boxSizing: "border-box",
          minHeight: 44,
          ...inputStyle,
        }}
      />
      <span aria-hidden="true" style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)", display: "flex" }}>
        {loading ? (
          <span style={{ width: 14, height: 14, border: "2px solid var(--color-border)", borderTopColor: "var(--color-brand)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        ) : (
          <MapPin size={16} />
        )}
      </span>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-input)",
            boxShadow: "var(--shadow-float)",
            listStyle: "none",
            padding: "0.375rem",
            margin: 0,
            zIndex: 60,
            maxHeight: "300px",
            overflowY: "auto",
            textAlign: "left",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "0.625rem 0.75rem",
                borderRadius: "7px",
                cursor: "pointer",
                background: i === active ? "var(--color-bg-selected)" : "transparent",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.9375rem" }}>{s.mainText}</span>
              {s.secondaryText && <span style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", marginTop: "0.125rem" }}>{s.secondaryText}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
