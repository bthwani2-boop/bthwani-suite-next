/**
 * tools/guards/design-tokens-gate.mjs
 *
 * Checks that components and pages do not use raw layout values (spacing, radius, font size, zIndex, etc.)
 * directly in styles. Must use design tokens or variables from shared/ui-kit.
 *
 * Governance decision: raw layout values = WARN only (never FAIL).
 * FAIL is reserved for raw colors, enforced in ui-kit-boundary-gate.
 *
 * Scope: apps-src + services-frontend
 * Excludes: shared/ui-kit/ (source of tokens), config, layout, styles
 */

import { fail, listCodeFiles, lineNumber, read } from "./_guard-utils.mjs";

const guardId = "design-tokens-gate";
const violations = [];
const warnings = [];

function inScope(f) {
  if (!/\.(tsx|jsx|ts|js)$/.test(f)) return false;
  if (f.startsWith("shared/ui-kit/")) return false; // ui-kit defines the tokens
  if (f.includes("node_modules")) return false;
  if (f.includes("generated")) return false;
  if (f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__")) return false;
  if (f.includes("android/") || f.includes("ios/")) return false;
  if (/\/(shell|providers?|layout|_layout)\.(tsx?|jsx?)$/.test(f)) return false;
  if (f.includes("/styles/") || f.includes("/theme/")) return false;
  if (f.startsWith("tools/")) return false;

  const inApps = /^apps\//.test(f);
  const inServicesFrontend = /^services\/[^/]+\/frontend\//.test(f);
  return inApps || inServicesFrontend;
}

// Matches raw numbers or px string literals assigned to styling layout properties:
// e.g., padding: 12, marginHorizontal: 8, borderRadius: 16, fontSize: 14, zIndex: 999
// Allowed: spacing[2], radius.sm, var(--...), etc.
const RAW_SPACING_MARGIN = /\b(padding|margin|gap|borderRadius|radius|fontSize|zIndex)(?:Left|Right|Top|Bottom|Horizontal|Vertical)?\s*:\s*(?:["']?(\d+)(?:px)?["']?|(\d+))\b/g;

const files = listCodeFiles().filter(inScope);

for (const file of files) {
  const content = read(file);
  let m;

  RAW_SPACING_MARGIN.lastIndex = 0;
  while ((m = RAW_SPACING_MARGIN.exec(content)) !== null) {
    const prop = m[1];
    const val = parseInt(m[2] || m[3], 10);

    // Exception: 0 is always allowed for resetting spacing/margins
    if (val === 0) continue;
    // Exception: 1 or 2 is often used for border width (not a spacing token)
    if (val <= 2 && (prop === "borderWidth" || prop === "borderRadius" || prop === "radius")) continue;

    const msg = `RAW_LAYOUT_WARN: '${prop}': ${val} — use spacing/radius/zIndex tokens from shared/ui-kit.`;

    // Per governance decision: raw layout values are always WARN (not FAIL).
    // FAIL is reserved for raw colors (enforced in ui-kit-boundary-gate).
    const ln = lineNumber(content, m.index);
    warnings.push({ file, line: ln, message: msg });
  }
}

if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length} raw layout values found — fix progressively):`);
  for (const w of warnings) {
    console.log(`  - ${w.file}:${w.line} ${w.message}`);
  }
}

// violations is always empty — raw layout is WARN-only by design.
fail(guardId, violations);
