import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const outDir = path.join(repoRoot, ".diagnostics", "tools-v5");
fs.mkdirSync(outDir, { recursive: true });

function readJson(rel, fallback) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readText(rel) {
  const file = path.join(repoRoot, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const catalog = readJson("tools/toolchain/tool-catalog.v5.json", { entries: [] });
const decisions = readJson("tools/toolchain/tool-decisions.json", { decisions: {} }).decisions || {};
const owners = readJson("tools/toolchain/tool-owners.json", { owners: {} }).owners || {};
const baseline = readJson("tools/toolchain/tool-activation-baseline.json", { baseline: {} }).baseline || {};
const pkg = readJson("package.json", { scripts: {} });
const scripts = pkg.scripts || {};
const workflowDir = path.join(repoRoot, ".github/workflows");
const workflowText = fs.existsSync(workflowDir)
  ? fs.readdirSync(workflowDir).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml")).map((name) => fs.readFileSync(path.join(workflowDir, name), "utf8")).join("\n")
  : "";

function scriptFor(tool) {
  return tool.package_script || tool.fulfilled_by || "";
}

function ciStepFound(tool, script) {
  if (tool.id === "codeql") return /github\/codeql-action/i.test(workflowText);
  if (tool.id === "sonarqube") return /sonarqube/i.test(workflowText);
  if (!script) return false;
  return workflowText.includes(`pnpm run ${script}`) || workflowText.includes(script);
}

const rows = [];
for (const tool of catalog.entries || []) {
  const script = scriptFor(tool);
  const declared = baseline[tool.id] || tool.activation || "unknown";
  const packageScriptFound = script ? Boolean(scripts[script]) || script.startsWith("github/") || script === "sonarqube" : false;
  const ci = ciStepFound(tool, script);
  const evidence = packageScriptFound || ci || Boolean(tool.fulfilled_by);

  rows.push({
    id: tool.id,
    category: tool.category,
    priority: tool.priority,
    decision: decisions[tool.id]?.action || "unknown",
    owner: owners[tool.id]?.team || "unassigned",
    declared_activation: declared,
    package_script: script || null,
    package_script_found: packageScriptFound,
    ci_step_found: ci,
    fulfilled_by: tool.fulfilled_by || null,
    evidence_found: evidence,
    verified_activation: declared === "active" && packageScriptFound && ci ? "active_verified" :
      declared === "active" ? "active_unverified" :
      declared === "partial" ? "partial" :
      declared === "optional" ? "optional" : "unknown"
  });
}

const counts = rows.reduce((acc, row) => {
  acc[row.verified_activation] = (acc[row.verified_activation] || 0) + 1;
  return acc;
}, {});

fs.writeFileSync(path.join(outDir, "tool-catalog-status.json"), JSON.stringify(rows, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "activation-report.json"), JSON.stringify(counts, null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "missing-tools.json"), JSON.stringify(rows.filter((row) => row.verified_activation === "active_unverified"), null, 2), "utf8");
fs.writeFileSync(path.join(outDir, "tool-decisions.json"), JSON.stringify(decisions, null, 2), "utf8");

const summary = [];
summary.push("# BThwani Toolchain V5 Diagnostics Summary");
summary.push(`\n*Generated: ${new Date().toISOString()}*`);
summary.push("\n## Verification semantics");
summary.push("- active_verified: declared active and has package/workflow evidence.");
summary.push("- active_unverified: declared active but lacks required evidence.");
summary.push("- partial: integrated or planned, warn-only until baseline closure.");
summary.push("- optional: local/manual/diagnostics-only.");
summary.push("\n## Counts");
for (const [key, value] of Object.entries(counts).sort()) summary.push(`- ${key}: ${value}`);
summary.push("\n## Tool Matrix");
summary.push("| Tool | Declared | Verified | Script | Script Found | CI Found |");
summary.push("|---|---:|---:|---|---:|---:|");
for (const row of rows) {
  summary.push(`| \`${row.id}\` | ${row.declared_activation} | ${row.verified_activation} | ${row.package_script || ""} | ${row.package_script_found} | ${row.ci_step_found} |`);
}
fs.writeFileSync(path.join(outDir, "00-summary.md"), summary.join("\n"), "utf8");

const tasks = [];
tasks.push("# Generated Toolchain Tasks");
for (const row of rows.filter((item) => item.verified_activation === "active_unverified" || item.declared_activation === "partial")) {
  tasks.push(`- [ ] ${row.id}: ${row.verified_activation}; script=${row.package_script || "none"}; ci=${row.ci_step_found}`);
}
fs.writeFileSync(path.join(outDir, "tasks.generated.md"), tasks.join("\n"), "utf8");

console.log("V5 toolchain diagnostics written to .diagnostics/tools-v5");
