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

const duplicateSymbols = manifest.duplicateSymbols ?? [];
for (const duplicate of duplicateSymbols) {
  violations.push({
    file: manifestFile,
    message: `DUPLICATE_PUBLIC_SYMBOL:${duplicate.symbol}:${duplicate.owners.join(",")}`,
  });
}

const sourceFiles = (manifest.modules ?? []).map((module) => module.path);
for (const file of sourceFiles) {
  const source = read(file);
  if (/\b(?:TODO|FIXME|HACK)\b/.test(source)) {
    violations.push({ file, message: "UNRESOLVED_UI_MARKER" });
  }
  if (/Math\.random\s*\(/.test(source)) {
    violations.push({ file, message: "SYNTHETIC_UI_RANDOMNESS_FORBIDDEN" });
  }
}

for (const interactiveFile of [
  "shared/ui-kit/src/components/Button/index.tsx",
  "shared/ui-kit/src/components/IconButton/index.tsx",
  "shared/ui-kit/src/components/Checkbox/index.tsx",
  "shared/ui-kit/src/components/Tabs/index.tsx",
  "shared/ui-kit/src/components/Dialog/index.tsx",
  "shared/ui-kit/src/components/Sheet/index.tsx",
]) {
  const absolute = path.join(repoRoot, interactiveFile);
  if (!fs.existsSync(absolute)) {
    violations.push({ file: interactiveFile, message: "INTERACTIVE_COMPONENT_SOURCE_MISSING" });
    continue;
  }
  const source = read(interactiveFile);
  if (!/accessibility|aria-|role=|accessibilityRole/.test(source)) {
    violations.push({ file: interactiveFile, message: "INTERACTIVE_ACCESSIBILITY_CONTRACT_MISSING" });
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
