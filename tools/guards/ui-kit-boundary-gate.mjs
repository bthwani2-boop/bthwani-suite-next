import fs from "node:fs";
import path from "node:path";
import { fail, findImportSpecifiers, lineNumber, listCodeFiles, listFiles, listStyleFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "ui-kit-boundary-gate";
const violations = [];

// 1. no-direct-tamagui-outside-ui-kit (Error)
for (const file of listCodeFiles()) {
  if (file.startsWith("shared/ui-kit/")) continue;

  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "tamagui" || item.specifier.startsWith("@tamagui/")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `direct Tamagui import is allowed only inside shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

// 2. no-ui-kit-deep-imports (Error)
for (const file of listCodeFiles()) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    const spec = item.specifier;
    const ALLOWED_SUBPATHS = ["@bthwani/ui-kit/web", "@bthwani/ui-kit/mobile", "@bthwani/ui-kit/next", "@bthwani/ui-kit/tokens"];
    const isDeepAlias = spec.startsWith("@bthwani/ui-kit/") && !ALLOWED_SUBPATHS.includes(spec);
    const isDeepPath = spec.includes("shared/ui-kit/src/") || spec.includes("shared/ui-kit/tokens/");

    if (isDeepAlias || isDeepPath) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `import from public @bthwani/ui-kit only, not deep path: ${spec}`
      });
    }
  }
}

// 3. no-local-design-system (Error)
const forbiddenPathRegex = /(^|\/)(design-system|ui-kit|tokens|theme|themes|primitives)(\/|$)/i;
const allowedPrefixes = ["shared/ui-kit/", "governance/", "tools/"];

for (const file of listFiles()) {
  if (allowedPrefixes.some((prefix) => file.startsWith(prefix))) continue;

  if (forbiddenPathRegex.test(file)) {
    violations.push({
      file,
      message: "local design-system/theme/token folder is forbidden outside shared/ui-kit"
    });
  }
}

// 4. no-expo-in-ui-kit (Error)
const packagePath = path.join(repoRoot, "shared/ui-kit/package.json");
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  for (const section of ["dependencies", "peerDependencies", "devDependencies"]) {
    for (const dependency of Object.keys(packageJson[section] ?? {})) {
      if (dependency === "expo" || dependency.startsWith("expo-")) {
        violations.push({ file: "shared/ui-kit/package.json", message: `${section} must not include ${dependency}` });
      }
    }
  }
}

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/") && !item.includes("Icon/Icon.tsx"))) {
  const content = read(file);
  for (const item of findImportSpecifiers(content)) {
    if (item.specifier === "expo" || item.specifier.startsWith("expo-")) {
      violations.push({
        file,
        line: lineNumber(content, item.index),
        message: `Expo import is forbidden in shared/ui-kit: ${item.specifier}`
      });
    }
  }
}

// 5. no-domain-component-in-ui-kit (Error)
const domainPattern = /\b(store|product|cart|checkout|order|wallet|payment|captain|courier|partner|merchant|dispatch|settlement|refund)\b/i;

for (const file of listCodeFiles().filter((item) => item.startsWith("shared/ui-kit/src/components/"))) {
  const baseName = path.basename(file, path.extname(file));
  const content = read(file);
  if (domainPattern.test(baseName)) {
    violations.push({ file, message: `domain-specific component name is forbidden in shared/ui-kit: ${baseName}` });
    continue;
  }

  const exportedSymbols = content.matchAll(/\bexport\s+(?:type|interface|class|function|const)\s+([A-Za-z0-9_]+)/g);
  for (const match of exportedSymbols) {
    if (domainPattern.test(match[1])) {
      violations.push({ file, message: `domain-specific public symbol is forbidden in shared/ui-kit: ${match[1]}` });
    }
  }
}

// 6. no-duplicate-design-primitives (Error)
const allowedPrefixesPrimitives = ["shared/ui-kit/"];
const forbiddenBasenames = new Set([
  "ActionBar",
  "Badge",
  "Button",
  "Card",
  "Chip",
  "DataTable",
  "Dialog",
  "EmptyState",
  "ErrorState",
  "FilterBar",
  "Header",
  "IconButton",
  "ListItem",
  "LoadingState",
  "OfflineState",
  "PermissionState",
  "Sheet",
  "StateView",
  "Surface",
  "Tabs",
  "Text",
  "TextField",
  "Toolbar",
  "CpPrimitives"
]);

for (const file of listCodeFiles()) {
  if (allowedPrefixesPrimitives.some((prefix) => file.startsWith(prefix))) continue;

  const basename = path.basename(file, path.extname(file));
  if (forbiddenBasenames.has(basename)) {
    if (basename === "CpPrimitives" && file === "apps/control-panel/runtime/src/components/CpPrimitives.tsx") {
      continue;
    }
    violations.push({
      file,
      message: `reusable design primitive '${basename}' belongs in shared/ui-kit`
    });
  }
}

// Removes custom-property *names* only, so that a token reference such as
// `var(--cp-border)` scans clean while the fallback in `var(--cp-border, #E2E8F0)`
// stays visible. A literal inside a fallback is still a hardcoded color: it is
// what renders whenever the token is missing, and it drifts from the token
// silently. Stripping the whole var() call — as this helper used to do — is what
// hid most of the raw colors in the control panel.
function stripCssVars(str) {
  return str.replace(/--[A-Za-z0-9_-]+/g, " ");
}

// 7. no-raw-colors-outside-ui-kit (Error)
//
// Scans code AND stylesheets. Every finding is a hard violation unless it is
// listed in the ratchet baseline; a baseline entry that no longer matches is
// itself a violation, so the list can only ever shrink.
const RAW_COLOR_BASELINE_PATH = "tools/guards/control-panel/raw-color-baseline.json";

// Files permitted to inline literal colors because they are the token-injection
// boundary itself. Exact paths only — never a suffix or directory match.
const RAW_COLOR_ALLOWLIST = new Set([]);

function isExcludedFromColors(file) {
  if (RAW_COLOR_ALLOWLIST.has(file)) return true;
  return (
    file.startsWith("shared/ui-kit/") ||
    file.startsWith("tools/") ||
    file.startsWith("governance/") ||
    file.startsWith("infra/") ||
    file.startsWith("contracts/") ||
    file.endsWith(".d.ts") ||
    file.endsWith("config.js") ||
    file.endsWith("config.ts")
  );
}

// Baseline keys ignore line numbers so unrelated edits above a known violation
// do not invalidate the entry; the normalized snippet plus an occurrence index
// keeps duplicate lines within one file distinguishable.
function snippetKey(file, snippet) {
  return `${file}::${snippet.replace(/\s+/g, " ").trim()}`;
}

function collectRawColorFindings() {
  const findings = [];
  for (const file of [...listCodeFiles(), ...listStyleFiles()]) {
    if (isExcludedFromColors(file)) continue;

    const content = read(file);
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "").trim();
      if (cleanLine.length === 0) continue;

      // var() / color-mix() fallbacks are stripped everywhere: a literal inside
      // a fallback is still a literal, but the surrounding token reference is not.
      const lineToTest = stripCssVars(cleanLine);

      const hasHex = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/gi.test(lineToTest);
      const hasCssColor = /\b(?:rgb|rgba|hsl|hsla)\([^)]+\)/gi.test(lineToTest);

      if (hasHex || hasCssColor) {
        findings.push({ file, line: i + 1, snippet: line.trim() });
      }
    }
  }
  return findings;
}

const rawColorFindings = collectRawColorFindings();

if (process.env.BTHWANI_WRITE_RAW_COLOR_BASELINE === "1") {
  const generated = rawColorFindings.map(({ file, line, snippet }) => ({
    file,
    line,
    snippet: snippet.replace(/\s+/g, " ").trim(),
    reason: "pre-existing at Phase 0 of the control-panel remediation; must be removed, not extended"
  }));
  fs.writeFileSync(
    path.join(repoRoot, RAW_COLOR_BASELINE_PATH),
    `${JSON.stringify({ entries: generated }, null, 2)}\n`,
    "utf8"
  );
  console.log(`${guardId}: wrote ${generated.length} baseline entries to ${RAW_COLOR_BASELINE_PATH}`);
  process.exit(0);
}

const baselineFullPath = path.join(repoRoot, RAW_COLOR_BASELINE_PATH);
const baselineRemaining = new Map();
if (fs.existsSync(baselineFullPath)) {
  const parsed = JSON.parse(fs.readFileSync(baselineFullPath, "utf8"));
  for (const entry of parsed.entries ?? []) {
    const key = snippetKey(entry.file, entry.snippet ?? "");
    baselineRemaining.set(key, (baselineRemaining.get(key) ?? 0) + 1);
  }
}

for (const finding of rawColorFindings) {
  const key = snippetKey(finding.file, finding.snippet);
  const remaining = baselineRemaining.get(key) ?? 0;
  if (remaining > 0) {
    baselineRemaining.set(key, remaining - 1);
    continue;
  }
  violations.push({
    file: finding.file,
    line: finding.line,
    message: `FORBIDDEN: raw color value found in styling: "${finding.snippet}". Use brand tokens or colorRoles from shared/ui-kit instead.`
  });
}

for (const [key, remaining] of baselineRemaining) {
  if (remaining <= 0) continue;
  const [file] = key.split("::");
  violations.push({
    file: RAW_COLOR_BASELINE_PATH,
    message: `stale baseline entry for ${file} no longer matches the source (${remaining} occurrence(s)); delete it — the baseline may only shrink`
  });
}

// 8. platform-imports-validation (Error)
for (const file of listCodeFiles()) {
  const content = read(file);
  const isWebOnly = file.includes("control-panel/") || file.includes("/web/");
  const isMobileOnly = file.includes("app-captain/") || file.includes("app-client/") || file.includes("app-field/") || file.includes("app-partner/") || file.includes("/mobile/");

  for (const item of findImportSpecifiers(content)) {
    const spec = item.specifier;
    
    if (isWebOnly) {
      const isMobileOnlyPkg = spec === "react-native" || spec.startsWith("react-native-") || spec === "expo" || spec.startsWith("expo-") || spec === "@tamagui/native";
      if (isMobileOnlyPkg) {
        violations.push({
          file,
          line: lineNumber(content, item.index),
          message: `FORBIDDEN: importing mobile-only library '${spec}' in web-only / control-panel file`
        });
      }
    }

    if (isMobileOnly) {
      const isWebOnlyPkg = spec.startsWith("next/") || spec === "react-dom" || spec.startsWith("react-dom/") || spec === "@tamagui/web";
      if (isWebOnlyPkg) {
        violations.push({
          file,
          line: lineNumber(content, item.index),
          message: `FORBIDDEN: importing Next.js / web-only library '${spec}' in mobile / Expo file`
        });
      }
    }
  }
}

fail(guardId, violations);
