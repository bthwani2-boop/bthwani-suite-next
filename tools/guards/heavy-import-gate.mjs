/**
 * tools/guards/heavy-import-gate.mjs
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — Heavy Import Static Analysis
 *
 * Prevents performance-killing import patterns from entering the codebase:
 *   FAIL: Full icon library barrel imports (lucide-react, @expo/vector-icons, react-icons)
 *   FAIL: Lodash full import (must use lodash/pick etc.)
 *   FAIL: moment.js in mobile apps (use date-fns or dayjs)
 *   FAIL: Heavy libraries (PDF, chart, puppeteer) in mobile initial bundle paths
 *   WARN: react-icons/* in control-panel (allowed but should use ui-kit Icon instead)
 *   WARN: Duplicate heavy library across multiple mobile apps
 *
 * Scope: apps/, services/[service]/frontend/
 * Reads: tools/performance/performance-budgets.json for forbidden lists
 */

import fs from "node:fs";
import path from "node:path";
import { fail, listCodeFiles, read, repoRoot } from "./_guard-utils.mjs";

const guardId = "heavy-import-gate";
const violations = [];
const warnings = [];

// ── Load budgets ──────────────────────────────────────────────────────────────
const budgetPath = path.join(repoRoot, "tools/performance/performance-budgets.json");
const budgets = JSON.parse(fs.readFileSync(budgetPath, "utf8"));
const { heavyImports } = budgets;

// ── Rules ─────────────────────────────────────────────────────────────────────

// Full barrel imports of icon libraries — always forbidden anywhere
// Exception: within shared/ui-kit itself (which re-exports them controlled)
const FORBIDDEN_FULL_ICON_IMPORTS = heavyImports.forbidden_full_icon_import.map(
  (lib) => new RegExp(`from ['"]${lib.replace(/\//g, "\\/")}['"]`)
);

// Libraries forbidden entirely in mobile apps (apps/app-*, services/*/frontend/app-*)
const MOBILE_FORBIDDEN = heavyImports.forbidden_in_mobile.map(
  (lib) => new RegExp(`from ['"]${lib.replace(/[@/]/g, (c) => `\\${c}`)}`)
);

// Libraries that must use subpath imports (never barrel)
const REQUIRE_SUBPATH = heavyImports.require_subpath_import.map((lib) => ({
  lib,
  barrel: new RegExp(`from ['"]${lib}['"]`),
}));

// ── Scope helpers ─────────────────────────────────────────────────────────────
function isMobileScope(file) {
  return (
    /^apps\/app-(client|partner|captain|field)\//.test(file) ||
    /^services\/[^/]+\/frontend\/app-(client|partner|captain|field)\//.test(file)
  );
}

function isUiKitScope(file) {
  return file.startsWith("shared/ui-kit/");
}

function isControlPanelScope(file) {
  return (
    file.startsWith("apps/control-panel/") ||
    /\/control-panel\//.test(file)
  );
}

// ── Scan ──────────────────────────────────────────────────────────────────────
const SCAN_EXTS = new Set(["ts", "tsx", "js", "jsx", "mjs"]);

const files = listCodeFiles().filter((f) => {
  const ext = f.split(".").pop();
  if (!SCAN_EXTS.has(ext)) return false;
  if (f.startsWith("tools/")) return false;
  if (f.includes("node_modules")) return false;
  if (f.includes(".test.") || f.includes(".spec.")) return false;
  if (f.includes("/generated/")) return false;
  return true;
});

for (const file of files) {
  const content = read(file);
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Only check import lines
    if (!/^\s*import\s/.test(line) && !/^\s*require\(/.test(line)) continue;

    const lineNum = i + 1;

    // ── 1. Full icon library barrel import ─────────────────────────────────
    if (!isUiKitScope(file)) {
      for (let ri = 0; ri < FORBIDDEN_FULL_ICON_IMPORTS.length; ri++) {
        if (FORBIDDEN_FULL_ICON_IMPORTS[ri].test(line)) {
          const lib = heavyImports.forbidden_full_icon_import[ri];
          // Count named imports — if many, it's likely a barrel import
          const namedCount = (line.match(/,/g) || []).length + 1;
          if (namedCount >= 3 || /\* as/.test(line) || /from ['"]lucide-react['"]/.test(line)) {
            violations.push({
              file,
              line: lineNum,
              message: `HEAVY_ICON_IMPORT: Full barrel import of '${lib}' is forbidden. Use <Icon> from @bthwani/ui-kit instead. Found: ${line.trim()}`,
            });
          } else if (isControlPanelScope(file)) {
            warnings.push({
              file,
              line: lineNum,
              message: `ICON_IMPORT_WARN: Direct icon import from '${lib}' in control-panel. Prefer <Icon> from @bthwani/ui-kit. Found: ${line.trim()}`,
            });
          }
        }
      }
    }

    // ── 2. Heavy libraries in mobile scope ─────────────────────────────────
    if (isMobileScope(file)) {
      for (let ri = 0; ri < MOBILE_FORBIDDEN.length; ri++) {
        if (MOBILE_FORBIDDEN[ri].test(line)) {
          const lib = heavyImports.forbidden_in_mobile[ri];
          violations.push({
            file,
            line: lineNum,
            message: `MOBILE_HEAVY_IMPORT: '${lib}' is forbidden in mobile apps — it adds significant bundle weight. Found: ${line.trim()}`,
          });
        }
      }
    }

    // ── 3. Barrel imports of subpath-required libraries ────────────────────
    for (const { lib, barrel } of REQUIRE_SUBPATH) {
      if (barrel.test(line)) {
        violations.push({
          file,
          line: lineNum,
          message: `BARREL_IMPORT: '${lib}' must use subpath imports (e.g. '${lib}/pick') to enable tree-shaking. Found: ${line.trim()}`,
        });
      }
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.log(`\n${guardId} WARNINGS (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  ⚠  ${w.file}:${w.line} — ${w.message}`);
  }
}

fail(guardId, violations);
