import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * src/core is the code a React Native app imports wholesale. It must stay free
 * of anything web- or Next-specific, and it must not reach up into src/lib or
 * src/components. This test is the guard — it is much easier to break the rule
 * by accident than to notice afterwards.
 */

const CORE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /from\s+["']next\//, why: "imports from next/*" },
  { pattern: /from\s+["']react["']/, why: "imports react" },
  { pattern: /from\s+["']@\/lib\//, why: "reaches into src/lib" },
  { pattern: /from\s+["']@\/components\//, why: "reaches into src/components" },
  { pattern: /from\s+["']@\/app\//, why: "reaches into src/app" },
  { pattern: /\bdocument\s*\./, why: "uses the DOM" },
  { pattern: /\blocalStorage\b/, why: "uses localStorage (no equivalent in RN)" },
];

function coreFiles(): string[] {
  return readdirSync(CORE_DIR)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(CORE_DIR, name));
}

describe("src/core stays platform-free", () => {
  it("has files to check", () => {
    assert.ok(coreFiles().length > 0, "expected .ts files directly in src/core");
  });

  for (const { pattern, why } of FORBIDDEN) {
    it(`no module ${why}`, () => {
      const offenders = coreFiles().filter((file) => pattern.test(readFileSync(file, "utf8")));
      assert.deepEqual(
        offenders.map((f) => f.replace(`${CORE_DIR}/`, "")),
        [],
        `src/core must not contain code that ${why} — move it to src/lib instead`,
      );
    });
  }

  it("only imports from within src/core", () => {
    const bad: string[] = [];
    for (const file of coreFiles()) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
        const specifier = match[1];
        const isRelativeWithinCore = specifier.startsWith("./");
        const isNodeBuiltin = specifier.startsWith("node:");
        if (!isRelativeWithinCore && !isNodeBuiltin) {
          bad.push(`${file.replace(`${CORE_DIR}/`, "")} -> ${specifier}`);
        }
      }
    }
    assert.deepEqual(bad, [], "src/core may only import its own modules");
  });
});
