/**
 * Raw color ramps. Platform-free — no CSS, no React.
 *
 * These are the only hex literals in the design system. Everything else
 * (semantic tokens, generated CSS custom properties, a future React Native
 * theme) is derived from this file.
 */

export const palette = {
  teaGreen: {
    50: "#f4f6ee",
    100: "#eaeedd",
    200: "#d5dcbc",
    300: "#c0cb9a",
    400: "#aaba78",
    500: "#95a857",
    600: "#778745",
    700: "#5a6534",
    800: "#3c4323",
    900: "#1e2211",
    950: "#15180c",
  },
  beige: {
    50: "#f7f9ec",
    100: "#eff2d9",
    200: "#e0e6b3",
    300: "#d0d98c",
    400: "#c0cc66",
    500: "#b0bf40",
    600: "#8d9933",
    700: "#6a7326",
    800: "#474d19",
    900: "#23260d",
    950: "#191b09",
  },
  cornsilk: {
    50: "#fefbe6",
    100: "#fdf7ce",
    200: "#fcef9c",
    300: "#fae76b",
    400: "#f9df39",
    500: "#f7d708",
    600: "#c6ac06",
    700: "#948105",
    800: "#635603",
    900: "#312b02",
    950: "#231e01",
  },
  papayaWhip: {
    50: "#fdf7e8",
    100: "#faefd1",
    200: "#f6dea2",
    300: "#f1ce74",
    400: "#edbd45",
    500: "#e8ad17",
    600: "#ba8a12",
    700: "#8b680e",
    800: "#5d4509",
    900: "#2e2305",
    950: "#201803",
  },
  lightBronze: {
    50: "#f9f2eb",
    100: "#f3e6d8",
    200: "#e7ccb1",
    300: "#dbb38a",
    400: "#cf9963",
    500: "#c3803c",
    600: "#9c6630",
    700: "#754d24",
    800: "#4e3318",
    900: "#271a0c",
    950: "#1b1208",
  },
} as const;

/** CSS-variable name for a raw ramp entry, e.g. `--color-tea-green-600`. */
export const RAMP_CSS_NAMES: Record<keyof typeof palette, string> = {
  teaGreen: "tea-green",
  beige: "beige",
  cornsilk: "cornsilk",
  papayaWhip: "papaya-whip",
  lightBronze: "light-bronze",
};
