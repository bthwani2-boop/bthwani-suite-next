/**
 * tools/scripts/generate-deep-tools-diagnostics-v5.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Diagnostic Report Generator
 *
 * Generates reports in .diagnostics/tools-v5/ (excluded from git tracking).
 */

import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const OUT_DIR = path.join(repoRoot, ".diagnostics", "tools-v5");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Load Catalog Data ─────────────────────────────────────────────────────────
const catalogPath   = path.join(repoRoot, "tools/toolchain/tool-catalog.v5.json");
const decisionsPath = path.join(repoRoot, "tools/toolchain/tool-decisions.json");
const ownersPath    = path.join(repoRoot, "tools/toolchain/tool-owners.json");
const baselinePath  = path.join(repoRoot, "tools/toolchain/tool-activation-baseline.json");

if (!fs.existsSync(catalogPath) || !fs.existsSync(decisionsPath) || !fs.existsSync(ownersPath) || !fs.existsSync(baselinePath)) {
  console.error("Error: Missing toolchain configuration files.");
  process.exit(1);
}

const catalog   = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, "utf8")).decisions;
const owners    = JSON.parse(fs.readFileSync(ownersPath, "utf8")).owners;
const baseline  = JSON.parse(fs.readFileSync(baselinePath, "utf8")).baseline;

// ── Analysis ──────────────────────────────────────────────────────────────────
const toolsList = catalog.entries || [];
const activeTools = [];
const missingTools = [];
const partialTools = [];
const optionalTools = [];

for (const tool of toolsList) {
  const act = baseline[tool.id];
  const dec = decisions[tool.id];
  const own = owners[tool.id];

  const record = {
    id: tool.id,
    category: tool.category,
    priority: tool.priority,
    oss_free: tool.oss_free,
    decision: dec ? dec.action : "unknown",
    reason: dec ? dec.reason : "",
    team: own ? own.team : "unassigned",
    scope: own ? own.scope : "unmapped",
    activation: act || "unknown",
  };

  if (act === "active") activeTools.push(record);
  else if (act === "partial") partialTools.push(record);
  else if (act === "optional") optionalTools.push(record);
  else missingTools.push(record);
}

// ── Write JSON reports ────────────────────────────────────────────────────────
fs.writeFileSync(path.join(OUT_DIR, "tool-catalog-status.json"), JSON.stringify(toolsList, null, 2), "utf8");
fs.writeFileSync(path.join(OUT_DIR, "tool-decisions.json"), JSON.stringify(decisions, null, 2), "utf8");
fs.writeFileSync(path.join(OUT_DIR, "missing-tools.json"), JSON.stringify(missingTools, null, 2), "utf8");
fs.writeFileSync(path.join(OUT_DIR, "activation-report.json"), JSON.stringify({
  activeCount: activeTools.length,
  partialCount: partialTools.length,
  optionalCount: optionalTools.length,
  missingCount: missingTools.length,
}, null, 2), "utf8");

// ── 00-summary.md Report Builder ──────────────────────────────────────────────
const summaryLines = [];
summaryLines.push(`# BThwani Toolchain V5 Diagnostics Summary`);
summaryLines.push(`\n*Generated: ${new Date().toISOString()}*`);
summaryLines.push(`*Total Scanned Tools: ${toolsList.length}*`);

summaryLines.push(`\n## Activation Statistics`);
summaryLines.push(`| Status | Count | Description |`);
summaryLines.push(`|---|---|---|`);
summaryLines.push(`| **Active** | ${activeTools.length} | Operational and mandatory in CI/CD pipeline |`);
summaryLines.push(`| **Partial** | ${partialTools.length} | Enabled in workflow but warnings/results are non-blocking |`);
summaryLines.push(`| **Optional** | ${optionalTools.length} | Local-only or manual diagnostics |`);
summaryLines.push(`| **Missing** | ${missingTools.length} | Not yet configured or disabled |`);

summaryLines.push(`\n## Active Tools Matrix`);
summaryLines.push(`| Tool ID | Category | Priority | Decision | Owner Team |`);
summaryLines.push(`|---|---|---|---|---|`);
for (const t of activeTools) {
  summaryLines.push(`| \`${t.id}\` | ${t.category} | ${t.priority} | ${t.decision} | ${t.team} |`);
}

summaryLines.push(`\n## Partial/Optional Tools`);
summaryLines.push(`| Tool ID | Category | Priority | Status | Description |`);
summaryLines.push(`|---|---|---|---|---|`);
for (const t of [...partialTools, ...optionalTools]) {
  summaryLines.push(`| \`${t.id}\` | ${t.category} | ${t.priority} | **${t.activation.toUpperCase()}** | ${t.reason} |`);
}

fs.writeFileSync(path.join(OUT_DIR, "00-summary.md"), summaryLines.join("\n"), "utf8");

// ── tasks.generated.md Task List Builder ──────────────────────────────────────
const taskLines = [];
taskLines.push(`# Generated Toolchain Tasks`);
taskLines.push(`\n*Generated: ${new Date().toISOString()}*`);
taskLines.push(`\n## Tasks for Missing/Partial Tools`);

for (const t of [...missingTools, ...partialTools]) {
  const checkbox = t.activation === "partial" ? "[/]" : "[ ]";
  taskLines.push(`- ${checkbox} **${t.id.toUpperCase()}** (${t.category}) — Priority: ${t.priority}`);
  taskLines.push(`  - Decision: ${t.decision}`);
  taskLines.push(`  - Owner: ${t.team}`);
  taskLines.push(`  - Action required: ${t.reason || "Full integration needed"}`);
}

fs.writeFileSync(path.join(OUT_DIR, "tasks.generated.md"), taskLines.join("\n"), "utf8");

console.log(`\n  V5 toolchain summary written to .diagnostics/tools-v5/00-summary.md`);
console.log(`  V5 toolchain task list written to .diagnostics/tools-v5/tasks.generated.md`);
console.log(`-----------------------------------------------`);
