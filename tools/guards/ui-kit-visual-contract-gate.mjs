import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "ui-kit-visual-contract-gate";
const violations = [];
const build = spawnSync(process.execPath, ["tools/scripts/build-ui-kit-catalog.mjs"], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: false,
});
process.stdout.write(build.stdout ?? "");
process.stderr.write(build.stderr ?? "");
if (build.error || build.status !== 0) {
  violations.push({
    file: "tools/scripts/build-ui-kit-catalog.mjs",
    message: `CATALOG_BUILD_FAILED:${build.error?.message ?? build.status ?? "unknown"}`,
  });
  fail(guardId, violations);
}

const manifestFile = ".diagnostics/ui-kit-catalog/manifest.json";
const htmlFile = ".diagnostics/ui-kit-catalog/index.html";
if (!fs.existsSync(path.join(repoRoot, manifestFile))) {
  violations.push({ file: manifestFile, message: "CATALOG_MANIFEST_MISSING" });
  fail(guardId, violations);
}
if (!fs.existsSync(path.join(repoRoot, htmlFile))) {
  violations.push({ file: htmlFile, message: "CATALOG_HTML_MISSING" });
  fail(guardId, violations);
}

const manifest = JSON.parse(read(manifestFile));
const modules = Array.isArray(manifest.modules) ? manifest.modules : [];
const symbols = new Set(manifest.publicSymbols ?? []);
for (const required of [
  "ActionBar",
  "Badge",
  "BthwaniUiProvider",
  "Button",
  "Card",
  "Checkbox",
  "DataGrid",
  "Dialog",
  "EmptyState",
  "ErrorState",
  "Icon",
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
]) {
  if (!symbols.has(required)) {
    violations.push({ file: manifestFile, message: `REQUIRED_UI_SYMBOL_MISSING:${required}` });
  }
}

// UI Kit intentionally exposes a small compatibility layer while consumers are
// migrated from the historical foundation/appearance entrypoints to canonical
// token modules. The allowlist is exact: a new symbol or owner pair still fails.
const approvedCompatibilityDuplicates = new Map([
  ["useDirection", ["shared/ui-kit/src/index.ts", "shared/ui-kit/src/providers.tsx"]],
  ["colorPalette", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/colors.ts"]],
  ["darkThemeColors", ["shared/ui-kit/src/appearance.ts", "shared/ui-kit/src/tokens/colors.ts"]],
  ["lightThemeColors", ["shared/ui-kit/src/appearance.ts", "shared/ui-kit/src/tokens/colors.ts"]],
  ["spacing", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/spacing.ts"]],
  ["radius", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/radius.ts"]],
  ["elevation", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/elevation.ts"]],
  ["motion", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/motion.ts"]],
  ["breakpoints", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/breakpoints.ts"]],
  ["FontFamilyToken", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/typography.ts"]],
  ["fontFamilies", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/typography.ts"]],
  ["fontWeights", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/typography.ts"]],
  ["borders", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/borders.ts"]],
  ["zIndex", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/z-index.ts"]],
  ["Direction", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/direction.ts"]],
  ["isRtlLanguage", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/direction.ts"]],
  ["resolveTextAlign", ["shared/ui-kit/src/foundation.ts", "shared/ui-kit/src/tokens/direction.ts"]],
]);

function isApprovedCompatibilityDuplicate(duplicate) {
  const approvedOwners = approvedCompatibilityDuplicates.get(duplicate.symbol);
  if (!approvedOwners) return false;
  const actual = [...new Set(duplicate.owners)].sort();
  const approved = [...approvedOwners].sort();
  return actual.length === approved.length && actual.every((owner, index) => owner === approved[index]);
}

for (const duplicate of manifest.duplicateSymbols ?? []) {
  if (isApprovedCompatibilityDuplicate(duplicate)) continue;
  violations.push({
    file: "ui-kit",
    message: `DUP:${duplicate.symbol}:${duplicate.owners.join(",")}`,
  });
}

for (const module of modules) {
  const source = read(module.path);
  if (/\b(?:TODO|FIXME|HACK)\b/.test(source)) {
    violations.push({ file: module.path, message: "UNRESOLVED_UI_MARKER" });
  }
  if (/Math\.random\s*\(/.test(source)) {
    violations.push({ file: module.path, message: "SYNTHETIC_UI_RANDOMNESS_FORBIDDEN" });
  }
}

for (const interactiveSymbol of [
  "Button",
  "IconButton",
  "Checkbox",
  "Tabs",
  "Dialog",
  "Sheet",
]) {
  const owner = modules.find((module) => module.exports?.includes(interactiveSymbol));
  if (!owner) {
    violations.push({
      file: manifestFile,
      message: `INTERACTIVE_COMPONENT_OWNER_MISSING:${interactiveSymbol}`,
    });
    continue;
  }
  const source = read(owner.path);
  if (!/accessibility|aria-|role=|accessibilityRole/.test(source)) {
    violations.push({
      file: owner.path,
      message: `INTERACTIVE_ACCESSIBILITY_CONTRACT_MISSING:${interactiveSymbol}`,
    });
  }
}

const html = read(htmlFile);
if (!html.includes('dir="rtl"')) {
  violations.push({ file: htmlFile, message: "RTL_CATALOG_CONTRACT_MISSING" });
}
if (!html.includes('name="viewport"')) {
  violations.push({ file: htmlFile, message: "RESPONSIVE_VIEWPORT_CONTRACT_MISSING" });
}
if ((manifest.moduleCount ?? 0) < 10 || (manifest.publicSymbolCount ?? 0) < 20) {
  violations.push({ file: manifestFile, message: "CATALOG_COVERAGE_TOO_SMALL" });
}

fail(guardId, violations);
