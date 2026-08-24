/**
 * Generates src/app/tokens.generated.css from src/theme/tokens.ts.
 *
 * Runs automatically via `predev` / `prebuild`. Do NOT edit the generated
 * file — edit src/theme/tokens.ts (or palette.ts) and re-run `npm run tokens`.
 *
 * This exists so the web's CSS custom properties and a React Native theme
 * object can never drift: both derive from the same TypeScript source.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { palette, RAMP_CSS_NAMES } from "../src/theme/palette";
import { lightTheme, darkTheme, cssVarName, type Theme } from "../src/theme/tokens";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "src/app/tokens.generated.css");

function rampBlock(): string {
  const lines: string[] = [];
  for (const [rampKey, ramp] of Object.entries(palette)) {
    const cssName = RAMP_CSS_NAMES[rampKey as keyof typeof palette];
    lines.push(`  /* ${cssName} */`);
    for (const [step, hex] of Object.entries(ramp)) {
      lines.push(`  --color-${cssName}-${step}: ${hex};`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function themeBlock(theme: Theme, indent = "  "): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(theme.color)) {
    lines.push(`${indent}--color-${cssVarName(key)}: ${value};`);
  }
  lines.push("");
  for (const [key, value] of Object.entries(theme.shadow)) {
    lines.push(`${indent}--shadow-${cssVarName(key)}: ${value};`);
  }
  return lines.join("\n");
}

function staticBlock(theme: Theme, indent = "  "): string {
  return [
    `${indent}--font-display: ${theme.font.display};`,
    `${indent}--font-sans: ${theme.font.sans};`,
    "",
    `${indent}--radius: ${theme.radius.base / 16}rem;`,
    `${indent}--radius-card: ${theme.radius.card}px;`,
    `${indent}--radius-input: ${theme.radius.input}px;`,
    `${indent}--radius-chip: ${theme.radius.chip}px;`,
  ].join("\n");
}

const css = `/*
 * AUTO-GENERATED — DO NOT EDIT.
 * Source: src/theme/tokens.ts + src/theme/palette.ts
 * Regenerate: npm run tokens
 */

:root {
${rampBlock()}

  /* Semantic tokens — light */
${themeBlock(lightTheme)}

${staticBlock(lightTheme)}
}

/* Semantic tokens — dark */
.dark {
${themeBlock(darkTheme)}
}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css, "utf8");
console.log(`tokens: wrote ${OUT}`);
