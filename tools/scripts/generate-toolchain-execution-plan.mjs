/**
 * tools/scripts/generate-toolchain-execution-plan.mjs
 *
 * BTHWANI_DEEP_TOOLS_GOVERNANCE_V5_AND_OSS_TOOLCHAIN_ACTIVATION — Toolchain Execution Plan
 *
 * Slices the 60 tools into local commands, CI workflow paths, and manual/scheduled schedules.
 * Generates .diagnostics/tools-v5/execution-plan.md.
 */

import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const OUT_FILE = path.join(repoRoot, ".diagnostics", "tools-v5", "execution-plan.md");

const catalogPath = path.join(repoRoot, "tools/toolchain/tool-catalog.v5.json");
const catalog     = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const localFast = [];
const ciFast    = [];
const ciAudit   = [];
const manualOnly = [];

for (const entry of catalog.entries || []) {
  const policy = entry.priority === "P0" ? "mandatory" : "warn-only";

  const record = {
    id: entry.id,
    category: entry.category,
    policy,
    activation: entry.activation,
  };

  if (entry.activation === "active" && entry.priority === "P0") {
    ciFast.push(record);
  } else if (entry.activation === "active" || entry.activation === "partial") {
    ciAudit.push(record);
  } else {
    manualOnly.push(record);
  }

  if (entry.id !== "codeql" && entry.id !== "sonarqube") {
    localFast.push(record);
  }
}

const lines = [];
lines.push(`# Toolchain V5 Execution Plan`);
lines.push(`\n*Generated: ${new Date().toISOString()}*`);

lines.push(`\n## 1. Fast CI Gates (ci.yml)`);
lines.push(`> These checks must execute under 2 minutes and fail-closed the build on any P0 violation.`);
lines.push(`\n| Tool ID | Category | Failure Policy |`);
lines.push(`|---|---|---|`);
for (const t of ciFast.slice(0, 15)) {
  lines.push(`| \`${t.id}\` | ${t.category} | **${t.policy.toUpperCase()}** |`);
}

lines.push(`\n## 2. Comprehensive Audit Pipeline (governance-audit.yml & security.yml)`);
lines.push(`> Deeper static analysis, licensing, secrets, and Docker security scanning.`);
lines.push(`\n| Tool ID | Category | Failure Policy | Activation |`);
lines.push(`|---|---|---|---|`);
for (const t of ciAudit) {
  lines.push(`| \`${t.id}\` | ${t.category} | ${t.policy} | ${t.activation} |`);
}

lines.push(`\n## 3. Manual & Diagnostics Tools (diagnostics-only)`);
lines.push(`> Heavy profiling, local state exploration, and mobile E2E tests.`);
lines.push(`\n| Tool ID | Category | Activation |`);
lines.push(`|---|---|`);
for (const t of manualOnly) {
  lines.push(`| \`${t.id}\` | ${t.category} | ${t.activation} |`);
}

fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");

console.log(`\n  Toolchain V5 execution plan written to .diagnostics/tools-v5/execution-plan.md`);
console.log(`-----------------------------------------------`);
