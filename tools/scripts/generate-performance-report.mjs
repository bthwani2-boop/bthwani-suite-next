/**
 * tools/scripts/generate-performance-report.mjs
 *
 * BTHWANI_PERFORMANCE_GOVERNANCE_GATE — Performance Diagnostic Report Generator
 *
 * Generates .diagnostics/performance/performance-summary.md from:
 *   - performance-budgets.json (budgets reference)
 *   - Go benchmark results (if available)
 *   - Bundle analysis stub (if .next/analyze exists)
 *   - P0/P1/P2 task list based on available data
 *
 * Usage:
 *   pnpm run diagnostics:performance
 */

import fs from "node:fs";
import path from "node:path";
import { repoRoot, toPosix } from "../guards/_guard-utils.mjs";

const OUT_DIR  = path.join(repoRoot, ".diagnostics", "performance");
const OUT_FILE = path.join(OUT_DIR, "performance-summary.md");
const BUDGET_FILE = path.join(repoRoot, "tools/performance/performance-budgets.json");

fs.mkdirSync(OUT_DIR, { recursive: true });

const now = new Date().toISOString();

// ── Load budgets ──────────────────────────────────────────────────────────────
let budgets = {};
if (fs.existsSync(BUDGET_FILE)) {
  budgets = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
}

// ── Collect Go benchmark results ──────────────────────────────────────────────
const GO_SERVICES = ["dsh", "wlt", "identity"];
const goBenchmarks = {};

for (const svc of GO_SERVICES) {
  const benchFile = path.join(OUT_DIR, `${svc}-go-benchmarks.txt`);
  if (fs.existsSync(benchFile)) {
    const content = fs.readFileSync(benchFile, "utf8");
    let benchLines = content.split(/\r?\n/).filter((l) => l.startsWith("Benchmark"));
    if (benchLines.length === 0) {
      // Fallback: show package test durations if no actual benchmarks are defined
      benchLines = content.split(/\r?\n/).filter((l) => {
        return l.startsWith("ok") || l.startsWith("?") || l.startsWith("FAIL");
      });
    }
    goBenchmarks[svc] = benchLines.slice(0, 25);
  }
}

// ── Detect bundle analysis ────────────────────────────────────────────────────
const analyzeDir = path.join(repoRoot, "apps/control-panel/runtime/.next/analyze");
const hasAnalysis = fs.existsSync(analyzeDir);

// ── Build report ──────────────────────────────────────────────────────────────
const lines = [];

lines.push(`# Performance Governance Report`);
lines.push(`\n*Generated: ${now}*`);
lines.push(`\n> Run \`pnpm run diagnostics:performance\` to regenerate.`);

// ── Budget Summary ────────────────────────────────────────────────────────────
lines.push(`\n---\n\n## Budget Reference (from performance-budgets.json)\n`);

if (budgets.api) {
  lines.push(`### API Latency Budgets\n`);
  lines.push(`| Service | Endpoint | p95 Budget |`);
  lines.push(`|---|---|---|`);
  if (budgets.api.dsh) {
    lines.push(`| DSH | health | ${budgets.api.dsh.health_p95_ms}ms |`);
    lines.push(`| DSH | catalog | ${budgets.api.dsh.catalog_p95_ms}ms |`);
    lines.push(`| DSH | checkout | ${budgets.api.dsh.checkout_p95_ms}ms |`);
    lines.push(`| DSH | orders_list | ${budgets.api.dsh.orders_list_p95_ms}ms |`);
    lines.push(`| DSH | error_rate | <${(budgets.api.dsh.error_rate_max * 100).toFixed(0)}% |`);
  }
  if (budgets.api.wlt) {
    lines.push(`| WLT | read | ${budgets.api.wlt.read_p95_ms}ms |`);
    lines.push(`| WLT | mutation | ${budgets.api.wlt.mutation_p95_ms}ms |`);
  }
  if (budgets.api.identity) {
    lines.push(`| Identity | health | ${budgets.api.identity.health_p95_ms}ms |`);
    lines.push(`| Identity | token_refresh | ${budgets.api.identity.token_refresh_p95_ms}ms |`);
  }
}

if (budgets.bundle) {
  lines.push(`\n### Bundle Budgets\n`);
  lines.push(`| Target | Budget |`);
  lines.push(`|---|---|`);
  lines.push(`| Control Panel initial JS | ${budgets.bundle.control_panel_initial_js_kb} KB |`);
  lines.push(`| Control Panel route chunk | ${budgets.bundle.control_panel_route_chunk_kb} KB |`);
  lines.push(`| Single dependency | ${budgets.bundle.single_dependency_kb} KB |`);
  lines.push(`| Mobile app initial JS | ${budgets.bundle.mobile_app_initial_js_kb} KB |`);
  lines.push(`| Mobile image asset | ${budgets.bundle.mobile_image_asset_kb} KB |`);
}

if (budgets.web) {
  lines.push(`\n### Web / Lighthouse Budgets\n`);
  lines.push(`| Metric | Budget |`);
  lines.push(`|---|---|`);
  lines.push(`| Lighthouse Performance | >= ${budgets.web.lighthouse_performance_min} |`);
  lines.push(`| LCP | <= ${budgets.web.lighthouse_lcp_max_ms}ms |`);
  lines.push(`| CLS | <= ${budgets.web.lighthouse_cls_max} |`);
  lines.push(`| Accessibility | >= ${budgets.web.lighthouse_accessibility_min} |`);
}

if (budgets.go) {
  lines.push(`\n### Go Benchmark Budgets\n`);
  lines.push(`| Threshold | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Regression WARN | +${budgets.go.benchmark_regression_warn_pct}% |`);
  lines.push(`| Regression FAIL | +${budgets.go.benchmark_regression_fail_pct}% |`);
  lines.push(`| Memory alloc increase WARN | +${budgets.go.memory_alloc_increase_warn_pct}% |`);
}

// ── Go benchmark results ──────────────────────────────────────────────────────
lines.push(`\n---\n\n## Go Benchmark Results\n`);
const hasAnyBench = Object.keys(goBenchmarks).length > 0;
if (!hasAnyBench) {
  lines.push(`> *No benchmark results found. Run \`pnpm run performance:go:bench:dsh\` to generate.*`);
} else {
  for (const [svc, benchLines] of Object.entries(goBenchmarks)) {
    lines.push(`\n### ${svc.toUpperCase()}\n`);
    lines.push("```");
    lines.push(...benchLines);
    lines.push("```");
  }
}

// ── Bundle analysis ───────────────────────────────────────────────────────────
lines.push(`\n---\n\n## Bundle Analysis\n`);
if (!hasAnalysis) {
  lines.push(`> *No bundle analysis found.*`);
  lines.push(`> Run: \`cd apps/control-panel/runtime && ANALYZE=true pnpm run build\``);
} else {
  lines.push(`✅ Bundle analysis available at: \`apps/control-panel/runtime/.next/analyze/\``);
  lines.push(`Open \`client.html\` or \`server.html\` in a browser to inspect.`);
}

// ── P0/P1/P2 Task list ───────────────────────────────────────────────────────
lines.push(`\n---\n\n## Performance Tasks\n`);
lines.push(`| Priority | Task | Status |`);
lines.push(`|---|---|---|`);
lines.push(`| P0 | Run k6 DSH smoke vs budget | ${hasAnyBench ? "⚠️ Manual" : "❌ Not run"} |`);
lines.push(`| P0 | Run k6 WLT smoke vs budget | ❌ Not run |`);
lines.push(`| P1 | Run Lighthouse CI on control-panel | ${hasAnalysis ? "⚠️ Partial" : "❌ Not run"} |`);
lines.push(`| P1 | Go benchmark baseline (DSH) | ${goBenchmarks.dsh ? "✅ Have baseline" : "❌ No baseline"} |`);
lines.push(`| P1 | Go benchmark baseline (WLT) | ${goBenchmarks.wlt ? "✅ Have baseline" : "❌ No baseline"} |`);
lines.push(`| P2 | Mobile bundle analysis (Expo Atlas) | ❌ Manual |`);
lines.push(`| P2 | DB query plan audit (EXPLAIN ANALYZE) | ❌ Manual |`);
lines.push(`| P2 | OTel trace budget verification | ❌ Manual |`);

lines.push(`\n---\n\n## How to Run Each Test\n`);
lines.push(`\`\`\`bash`);
lines.push(`# API load test (requires Docker runtime up)`);
lines.push(`pnpm run performance:api:k6:dsh`);
lines.push(`pnpm run performance:api:k6:wlt`);
lines.push(``);
lines.push(`# Go benchmarks`);
lines.push(`pnpm run performance:go:bench:dsh`);
lines.push(`pnpm run performance:go:bench:wlt`);
lines.push(``);
lines.push(`# Bundle analysis (control-panel)`);
lines.push(`cd apps/control-panel/runtime`);
lines.push(`ANALYZE=true pnpm run build`);
lines.push(``);
lines.push(`# Lighthouse CI (requires build first)`);
lines.push(`cd apps/control-panel/runtime`);
lines.push(`pnpm run build && pnpm exec lhci autorun --config=../../../tools/performance/web/lighthouserc.cjs`);
lines.push(`\`\`\``);

// ── Write ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");

console.log(`\n  Report written to ${toPosix(path.relative(repoRoot, OUT_FILE))}`);
console.log(`\n--- PERFORMANCE REPORT COMPLETE ---`);
console.log(`  Budget sections: ${Object.keys(budgets).filter((k) => !k.startsWith("_")).length}`);
console.log(`  Go benchmarks available: ${Object.keys(goBenchmarks).length > 0 ? Object.keys(goBenchmarks).join(", ") : "none"}`);
console.log(`  Bundle analysis available: ${hasAnalysis}`);
console.log(`-----------------------------------`);
