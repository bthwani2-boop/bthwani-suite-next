import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../guards/_guard-utils.mjs";

const outFile = path.join(repoRoot, ".diagnostics", "tools-v5", "execution-plan.md");
fs.mkdirSync(path.dirname(outFile), { recursive: true });

function readJson(rel, fallback) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const statusFile = path.join(repoRoot, ".diagnostics", "tools-v5", "tool-catalog-status.json");
let rows;
if (fs.existsSync(statusFile)) {
  rows = JSON.parse(fs.readFileSync(statusFile, "utf8"));
} else {
  const catalog = readJson("tools/toolchain/tool-catalog.v5.json", { entries: [] });
  rows = (catalog.entries || []).map((entry) => ({
    id: entry.id,
    category: entry.category,
    declared_activation: entry.activation,
    verified_activation: "unverified",
    package_script: entry.package_script || entry.fulfilled_by || null,
    ci_step_found: false
  }));
}

const groups = {
  active_verified: rows.filter((row) => row.verified_activation === "active_verified"),
  active_unverified: rows.filter((row) => row.verified_activation === "active_unverified"),
  partial: rows.filter((row) => row.verified_activation === "partial" || row.declared_activation === "partial"),
  optional: rows.filter((row) => row.verified_activation === "optional" || row.declared_activation === "optional")
};

const lines = [];
lines.push("# Toolchain V5 Execution Plan");
lines.push(`\n*Generated: ${new Date().toISOString()}*`);

for (const [title, items] of Object.entries(groups)) {
  lines.push(`\n## ${title}`);
  lines.push("| Tool | Category | Script | CI evidence |");
  lines.push("|---|---|---|---:|");
  for (const item of items) {
    lines.push(`| \`${item.id}\` | ${item.category || ""} | ${item.package_script || ""} | ${Boolean(item.ci_step_found)} |`);
  }
}

fs.writeFileSync(outFile, lines.join("\n"), "utf8");
console.log("Toolchain V5 execution plan written to .diagnostics/tools-v5/execution-plan.md");
