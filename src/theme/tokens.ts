/**
 * Semantic design tokens — the single source of truth for Irie's look.
 *
 * Two consumers derive from this file and can never drift apart:
 *   1. Web  — `scripts/generate-tokens-css.mjs` emits `src/app/tokens.generated.css`
 *             as `:root` / `.dark` custom properties. Run via `predev` / `prebuild`.
 *   2. Native — a future React Native app imports `lightTheme` / `darkTheme`
 *             directly and reads values off the object (RN has no CSS cascade).
 *
 * Rule: never add a hex literal here. Reference `palette` instead, so every
 * color stays traceable to a ramp.
 */

import { palette as p } from "./palette";

export interface Theme {
  name: "light" | "dark";
  color: {
    /* Backgrounds */
    bg: string;
    bgSubtle: string;
    bgCard: string;
    bgInput: string;
    bgSelected: string;
    bgOverlay: string;

    /* Surfaces */
    surface: string;
    border: string;
    borderFocus: string;

    /* Text */
    text: string;
    textMuted: string;
    textFaint: string;
    textInverse: string;

    /* Brand */
    brand: string;
    brandHover: string;
    brandLight: string;
    brandMid: string;
    brandDisabled: string;

    /* Accents */
    accent: string;
    accentHover: string;
    accentWarm: string;
    highlight: string;
    heading: string;

    /* Trip hero */
    headerBg: string;
    headerText: string;
    headerMuted: string;
    headerLabel: string;

    /* Error */
    errorText: string;
    errorBg: string;
    errorBorder: string;
  };
  shadow: { card: string; float: string };
  radius: { base: number; card: number; input: number; chip: number };
  font: { display: string; sans: string };
}

const radius = { base: 12, card: 14, input: 10, chip: 999 };
const font = {
  display: '"DM Serif Display", Georgia, serif',
  sans: '"Inter", system-ui, sans-serif',
};

export const lightTheme: Theme = {
  name: "light",
  color: {
    bg: p.teaGreen[50],
    bgSubtle: p.beige[50],
    bgCard: p.cornsilk[50],
    bgInput: "#ffffff",
    bgSelected: p.teaGreen[100],
    bgOverlay: "rgba(255, 255, 255, 0.08)",

    surface: "#ffffff",
    border: p.teaGreen[200],
    borderFocus: p.teaGreen[600],

    text: "#2d331a",
    textMuted: "#5b6635",
    textFaint: "#88994f",
    textInverse: "#fefae0",

    brand: "#5b6635",
    brandHover: "#2d331a",
    brandLight: "#d6debe",
    brandMid: p.teaGreen[500],
    brandDisabled: p.teaGreen[300],

    accent: "#96622e",
    accentHover: p.lightBronze[600],
    accentWarm: "#32210f",
    highlight: p.cornsilk[300],
    heading: "#32210f",

    headerBg: p.teaGreen[900],
    headerText: p.teaGreen[50],
    headerMuted: p.teaGreen[300],
    headerLabel: p.teaGreen[400],

    errorText: "#b91c1c",
    errorBg: "#fef2f2",
    errorBorder: "#fecaca",
  },
  shadow: {
    card: "0 2px 16px rgba(21, 24, 12, 0.07)",
    float: "0 8px 32px rgba(21, 24, 12, 0.12)",
  },
  radius,
  font,
};

export const darkTheme: Theme = {
  name: "dark",
  color: {
    bg: p.teaGreen[950],
    bgSubtle: p.teaGreen[900],
    bgCard: p.teaGreen[900],
    bgInput: p.teaGreen[800],
    bgSelected: p.teaGreen[800],
    bgOverlay: "rgba(0, 0, 0, 0.2)",

    surface: p.teaGreen[900],
    border: p.teaGreen[700],
    borderFocus: p.teaGreen[400],

    text: p.teaGreen[50],
    textMuted: p.teaGreen[300],
    textFaint: p.teaGreen[500],
    textInverse: p.teaGreen[950],

    brand: p.teaGreen[400],
    brandHover: p.teaGreen[300],
    brandLight: p.teaGreen[800],
    brandMid: p.teaGreen[500],
    brandDisabled: p.teaGreen[700],

    accent: p.lightBronze[400],
    accentHover: p.lightBronze[300],
    accentWarm: p.lightBronze[200],
    highlight: p.cornsilk[800],
    heading: p.lightBronze[200],

    headerBg: p.teaGreen[950],
    headerText: p.teaGreen[100],
    headerMuted: p.teaGreen[400],
    headerLabel: p.teaGreen[500],

    errorText: "#fca5a5",
    errorBg: "#450a0a",
    errorBorder: "#7f1d1d",
  },
  shadow: {
    card: "0 2px 16px rgba(0, 0, 0, 0.3)",
    float: "0 8px 32px rgba(0, 0, 0, 0.4)",
  },
  radius,
  font,
};

export const themes = { light: lightTheme, dark: darkTheme };

/** camelCase token key -> kebab-case CSS custom property suffix. */
export function cssVarName(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * `"var(--color-bg-card)"` for a given color token.
 * Lets web components reference tokens type-safely instead of typing raw strings.
 */
export function colorVar(key: keyof Theme["color"]): string {
  return `var(--color-${cssVarName(key)})`;
}
