"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Load the Google Maps script once
function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    if (document.getElementById("google-maps-script")) {
      // Script already injected — wait for it
      const interval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export default function PlacesAutocomplete({ value, onChange, placeholder = "e.g. Outer Banks, NC" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey).then(() => {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      setReady(true);
    }).catch(console.error);
  }, [apiKey]);

  const fetchSuggestions = useCallback((input: string) => {
    if (!serviceRef.current || !input.trim() || input.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    serviceRef.current.getPlacePredictions(
      {
        input,
        sessionToken: sessionTokenRef.current ?? undefined,
        types: ["(regions)"],
      },
      (predictions, status) => {
        setLoading(false);
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        setSuggestions(
          predictions.map((p) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting.main_text,
            secondaryText: p.structured_formatting.secondary_text ?? "",
          }))
        );
        setOpen(true);
      }
    );
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 220);
  }

  function handleSelect(suggestion: Suggestion) {
    onChange(suggestion.description);
    setSuggestions([]);
    setOpen(false);
    // Refresh session token after a selection
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setSuggestions([]);
    }
  }

  // Fall back to plain text input if no API key
  if (!apiKey) {
    return (
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "0.625rem 0.875rem",
          borderRadius: "10px",
          border: `1px solid ${focused ? "var(--color-tea-green-600)" : "var(--color-tea-green-200)"}`,
          background: "#ffffff",
          color: "var(--color-tea-green-950)",
          fontSize: "0.9375rem",
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          placeholder={ready ? placeholder : "Loading…"}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Delay closing so click on suggestion registers
            setTimeout(() => setOpen(false), 180);
          }}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "0.625rem 2.5rem 0.625rem 0.875rem",
            borderRadius: "10px",
            border: `1px solid ${focused ? "var(--color-tea-green-600)" : "var(--color-tea-green-200)"}`,
            background: "#ffffff",
            color: "var(--color-tea-green-950)",
            fontSize: "0.9375rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {/* Pin icon */}
        <span style={{
          position: "absolute",
          right: "0.75rem",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "1rem",
          pointerEvents: "none",
          opacity: 0.5,
        }}>
          📍
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <ul style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "#ffffff",
          border: "1px solid var(--color-tea-green-200)",
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(21,24,12,0.12)",
          listStyle: "none",
          padding: "0.375rem",
          margin: 0,
          zIndex: 50,
          maxHeight: "280px",
          overflowY: "auto",
        }}>
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              onMouseDown={() => handleSelect(s)}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "0.625rem 0.75rem",
                borderRadius: "7px",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-tea-green-50)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontWeight: 600, color: "var(--color-tea-green-950)", fontSize: "0.9375rem" }}>
                {s.mainText}
              </span>
              {s.secondaryText && (
                <span style={{ color: "var(--color-tea-green-600)", fontSize: "0.8125rem", marginTop: "0.125rem" }}>
                  {s.secondaryText}
                </span>
              )}
            </li>
          ))}
          <li style={{ padding: "0.375rem 0.75rem", display: "flex", justifyContent: "flex-end" }}>
            <img src="https://developers.google.com/static/maps/documentation/images/google_on_white.png" alt="Powered by Google" style={{ height: "14px", opacity: 0.6 }} />
          </li>
        </ul>
      )}
    </div>
  );
}
