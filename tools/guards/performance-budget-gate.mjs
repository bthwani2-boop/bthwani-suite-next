/**
 * tools/guards/performance-budget-gate.mjs
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — Budget Config Validator
 *
 * Verifies that:
 *   1. tools/performance/performance-budgets.json exists and is valid JSON
 *   2. All required budget sections are present with sensible values
 *   3. k6 scripts exist (prevents accidental deletion)
 *   4. lighthouserc.cjs exists for control-panel
 *
 * This gate is lightweight — no runtime required.
 * FAIL: budget file missing, invalid JSON, required keys absent, or values out of sane range.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "performance-budget-gate";
const violations = [];

// ── 1. Budget file existence and validity ─────────────────────────────────────
const budgetPath = path.join(repoRoot, "tools/performance/performance-budgets.json");

if (!fs.existsSync(budgetPath)) {
  violations.push({
    file: "tools/performance/performance-budgets.json",
    line: 0,
    message: "MISSING_BUDGET_FILE: performance-budgets.json must exist. It is the source of truth for all performance gates.",
  });
  fail(guardId, violations);
  process.exit(1); // can't continue without budget file
}

let budgets;
try {
  budgets = JSON.parse(fs.readFileSync(budgetPath, "utf8"));
} catch (e) {
  violations.push({
    file: "tools/performance/performance-budgets.json",
    line: 0,
    message: `INVALID_BUDGET_JSON: Could not parse performance-budgets.json — ${e.message}`,
  });
  fail(guardId, violations);
  process.exit(1);
}

// ── 2. Required sections ──────────────────────────────────────────────────────
const REQUIRED_SECTIONS = ["api", "bundle", "web", "mobile", "go", "db", "heavyImports"];
for (const section of REQUIRED_SECTIONS) {
  if (!budgets[section] || typeof budgets[section] !== "object") {
    violations.push({
      file: "tools/performance/performance-budgets.json",
      line: 0,
      message: `MISSING_BUDGET_SECTION: Required section '${section}' is missing or invalid.`,
    });
  }
}

// ── 3. Sanity checks on values ────────────────────────────────────────────────
function checkMs(val, key, min = 1, max = 5000) {
  if (typeof val !== "number" || val < min || val > max) {
    violations.push({
      file: "tools/performance/performance-budgets.json",
      line: 0,
      message: `BUDGET_VALUE_OUT_OF_RANGE: '${key}' = ${val} — expected ${min}–${max}ms.`,
    });
  }
}

if (budgets.api?.dsh) {
  checkMs(budgets.api.dsh.health_p95_ms,    "api.dsh.health_p95_ms",    50, 2000);
  checkMs(budgets.api.dsh.checkout_p95_ms,  "api.dsh.checkout_p95_ms",  100, 5000);
  if (budgets.api.dsh.error_rate_max > 0.1) {
    violations.push({ file: "tools/performance/performance-budgets.json", line: 0,
      message: "BUDGET_VALUE_OUT_OF_RANGE: api.dsh.error_rate_max > 0.1 (10%) — too permissive." });
  }
}

if (budgets.web?.lighthouse_performance_min !== undefined) {
  const score = budgets.web.lighthouse_performance_min;
  if (typeof score !== "number" || score < 50 || score > 100) {
    violations.push({ file: "tools/performance/performance-budgets.json", line: 0,
      message: `BUDGET_VALUE_OUT_OF_RANGE: web.lighthouse_performance_min = ${score} — expected 50–100.` });
  }
}

if (budgets.go?.benchmark_regression_fail_pct !== undefined) {
  if (budgets.go.benchmark_regression_fail_pct < budgets.go.benchmark_regression_warn_pct) {
    violations.push({ file: "tools/performance/performance-budgets.json", line: 0,
      message: "BUDGET_LOGIC_ERROR: go.benchmark_regression_fail_pct must be >= benchmark_regression_warn_pct." });
  }
}

// ── 4. Required performance artifact files ────────────────────────────────────
const REQUIRED_FILES = [
  { path: "tools/performance/k6/dsh-smoke.js",         label: "k6 DSH smoke script" },
  { path: "tools/performance/k6/wlt-smoke.js",         label: "k6 WLT smoke script" },
  { path: "tools/performance/k6/identity-smoke.js",    label: "k6 identity smoke script" },
  { path: "tools/performance/web/lighthouserc.cjs",    label: "Lighthouse CI config" },
];

for (const { path: relPath, label } of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(repoRoot, relPath))) {
    violations.push({
      file: relPath,
      line: 0,
      message: `MISSING_PERF_ARTIFACT: ${label} must exist at '${relPath}'. Do not delete performance configs.`,
    });
  }
}

fail(guardId, violations);
