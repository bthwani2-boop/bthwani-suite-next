/**
 * tools/guards/a11y-gate.mjs
 *
 * Static AST-text accessibility gate for bthwani-suite-next.
 *
 * Checks (without a browser — pure text/regex analysis on TSX/JSX):
 *   1. <Image> without alt or accessibilityLabel
 *   2. Pressable / TouchableOpacity that renders ONLY an icon (no text child)
 *      without accessibilityLabel or accessibilityHint
 *   3. Icon-only Pressable with no accessible label
 *   4. <div> / <span> with onClick but no role="button" and no aria-label
 *
 * Scope: apps-src + services-frontend
 *   Excludes: node_modules, generated, tests, android, ios
 *
 * Output: A11Y_GATE: PASS / FAIL
 */

import path from "node:path";
import { fail, listFiles, lineNumber, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "a11y-gate";
const violations = [];

// Files in scope: TSX/JSX only, inside apps/ or services/**/frontend/
function inScope(f) {
  if (!/\.(tsx|jsx)$/.test(f)) return false;
  if (f.includes("node_modules")) return false;
  if (f.includes("generated")) return false;
  if (f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__")) return false;
  if (f.includes("android/") || f.includes("ios/")) return false;
  const inApps = f.startsWith("apps/");
  const inServicesFrontend = /^services\/[^/]+\/frontend\//.test(f);
  const inShared = f.startsWith("shared/");
  const inUiKit = f.startsWith("packages/") || f.startsWith("libs/");
  return inApps || inServicesFrontend || inShared || inUiKit;
}

const files = listFiles().filter(inScope);

// ---------------------------------------------------------------------------
// Check 1: <Image without alt or accessibilityLabel
// Matches RN <Image> and HTML <img>
// We look for <Image or <img that lacks both alt= and accessibilityLabel=
// ---------------------------------------------------------------------------
const IMAGE_TAG = /<(?:Image|img)\b([^>]*(?:\n[^>]*){0,5}?)(?:\s*\/>|>)/g;

// ---------------------------------------------------------------------------
// Check 2: Pressable/TouchableOpacity wrapping icon-only (SVG/Icon component)
// without accessibilityLabel or accessibilityHint
// ---------------------------------------------------------------------------
// Detects: <Pressable ...> (no text content, only Icon or SVG) </Pressable>
// We check: if onPress exists but neither accessibilityLabel nor
// accessibilityHint appear nearby in the same Pressable block, warn.
//
// We use a conservative heuristic:
//   - Find <Pressable or <TouchableOpacity with onPress
//   - If it lacks accessibilityLabel AND accessibilityRole AND aria-label → flag
//   - Unless it has visible text in the same JSX block (Text child literal)
// ---------------------------------------------------------------------------
const PRESSABLE_OPEN = /<(Pressable|TouchableOpacity)\b/g;

// ---------------------------------------------------------------------------
// Check 3: Web — onClick div/span without role or aria-label
// ---------------------------------------------------------------------------
const ONCLICK_DIV = /<(div|span)\b([^>]*?)onClick([^>]*?)>/g;

for (const file of files) {
  const content = read(file);
  const isNative = file.startsWith("apps/app-") || file.includes("/frontend/");
  const isWeb = file.startsWith("apps/control-panel") || file.startsWith("apps/webapp") || file.startsWith("apps/website");

  // --- Check 1: Image without alt / accessibilityLabel ---
  let m;
  IMAGE_TAG.lastIndex = 0;
  while ((m = IMAGE_TAG.exec(content)) !== null) {
    const attrs = m[1];
    // Skip if it has alt= or accessibilityLabel= or role="presentation"
    if (/\balt\s*=/.test(attrs)) continue;
    if (/\baccessibilityLabel\s*=/.test(attrs)) continue;
    if (/role\s*=\s*["']presentation["']/.test(attrs)) continue;
    if (/role\s*=\s*["']none["']/.test(attrs)) continue;

    const ln = lineNumber(content, m.index);
    const lineContent = content.split(/\r?\n/)[ln - 1] || "";
    const prevLineContent = ln > 1 ? content.split(/\r?\n/)[ln - 2] || "" : "";
    if (lineContent.includes("a11y-ignore") || prevLineContent.includes("a11y-ignore")) continue;

    violations.push({ file, line: ln, message: "A11Y: <Image> missing alt or accessibilityLabel" });
  }

  // --- Check 2 (native only): Pressable/TouchableOpacity without accessible label ---
  if (isNative) {
    PRESSABLE_OPEN.lastIndex = 0;
    while ((m = PRESSABLE_OPEN.exec(content)) !== null) {
      // Extract a larger window starting at the tag to inspect attrs and children
      const snippet = content.slice(m.index, m.index + 2000);
      // Must have onPress to be interactive
      if (!/\bonPress\s*=/.test(snippet)) continue;
      // If it has accessibilityLabel, accessibilityHint, accessibilityRole, accessibilityState, accessibilityLiveRegion → OK
      if (/\baccessibilityLabel\s*=/.test(snippet)) continue;
      if (/\baccessibilityHint\s*=/.test(snippet)) continue;
      if (/\baccessibilityRole\s*=/.test(snippet)) continue;
      if (/\baccessibilityState\s*=/.test(snippet)) continue;
      if (/\baccessibilityLiveRegion\s*=/.test(snippet)) continue;
      if (/\baccessible\s*=\s*\{?\s*false\s*\}?/.test(snippet)) continue; // explicitly marked not accessible
      // If it has visible text content via Text component → OK (label derived from text)
      if (/<Text[\s>]/.test(snippet)) continue;
      if (/<SizableText[\s>]/.test(snippet)) continue;
      // If it has children={...} spread → we can't know statically, skip
      if (/children\s*=/.test(snippet)) continue;

      const ln = lineNumber(content, m.index);
      const lineContent = content.split(/\r?\n/)[ln - 1] || "";
      const prevLineContent = ln > 1 ? content.split(/\r?\n/)[ln - 2] || "" : "";
      if (lineContent.includes("a11y-ignore") || prevLineContent.includes("a11y-ignore")) continue;

      // Flag: interactive Pressable with no text child and no accessibility label
      violations.push({
        file,
        line: ln,
        message: `A11Y: <${m[1]}> with onPress has no visible text child and no accessibilityLabel/Role`,
      });
    }
  }

  // --- Check 3 (web only): onClick div/span without role or aria-label ---
  if (isWeb) {
    ONCLICK_DIV.lastIndex = 0;
    while ((m = ONCLICK_DIV.exec(content)) !== null) {
      const beforeOnClick = m[2];
      const afterOnClick = m[3];
      const fullAttrs = beforeOnClick + "onClick" + afterOnClick;
      if (/\brole\s*=/.test(fullAttrs)) continue;
      if (/\baria-label\s*=/.test(fullAttrs)) continue;
      if (/\baria-labelledby\s*=/.test(fullAttrs)) continue;

      const ln = lineNumber(content, m.index);
      const lineContent = content.split(/\r?\n/)[ln - 1] || "";
      const prevLineContent = ln > 1 ? content.split(/\r?\n/)[ln - 2] || "" : "";
      if (lineContent.includes("a11y-ignore") || prevLineContent.includes("a11y-ignore")) continue;

      violations.push({
        file,
        line: ln,
        message: `A11Y: <${m[1]}> with onClick has no role or aria-label`,
      });
    }
  }
}

if (violations.length > 0) {
  console.error(`\n${guardId}: FAIL (${violations.length})`);
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line ? v.line : ""} ${v.message}`);
  }
  process.exit(1);
}

console.log(`\n${guardId}: PASS`);
process.exit(0);
