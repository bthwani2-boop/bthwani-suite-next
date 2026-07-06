import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repoRoot } from "../guards/_guard-utils.mjs";

const outDir = path.join(repoRoot, ".diagnostics", "operational-journey-factory");
fs.mkdirSync(outDir, { recursive: true });

function headSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "HEAD_UNAVAILABLE";
  }
}

function readJson(name, fallback) {
  const file = path.join(outDir, name);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function gap({ source_tool, path: sourcePath, type, severity = "HIGH", journey = "factory", affected_surface = "multi-surface", owner = "unassigned", reason, suggested_action, verification_command, blocks_journey_start = true }) {
  return {
    gap_id: `${type}:${sourcePath}`.replace(/[^A-Za-z0-9:_./-]/g, "_"),
    source_tool,
    path: sourcePath,
    reason,
    severity,
    journey,
    affected_surface,
    owner,
    required_action: suggested_action,
    decision: blocks_journey_start ? "BLOCKED_NEEDS_EVIDENCE" : "FIX_REQUIRED",
    verification: verification_command,
    status: "OPEN",
    blocks_journey_start
  };
}

const toolchain = readJson("toolchain-inventory.json", null);
const surfaces = readJson("surface-inventory.json", null);
const journeys = readJson("journey-inventory.json", null);
const gaps = [];

if (!toolchain) {
  gaps.push(gap({
    source_tool: "generate-operational-toolchain-inventory",
    path: ".diagnostics/operational-journey-factory/toolchain-inventory.json",
    type: "CI_NOT_PROVEN",
    reason: "Toolchain inventory missing.",
    suggested_action: "run diagnostics:operational:toolchain",
    verification_command: "pnpm run diagnostics:operational:toolchain"
  }));
} else {
  for (const tool of toolchain.tools || []) {
    if ((tool.classification || []).some((item) => ["ACTIVE_FAIL", "MISSING_SCRIPT", "UNMAPPED_TOOL", "NEEDS_OWNER"].includes(item))) {
      gaps.push(gap({
        source_tool: "toolchain-inventory",
        path: tool.tool_id,
        type: "CI_NOT_PROVEN",
        severity: tool.classification.includes("ACTIVE_FAIL") ? "CRITICAL" : "HIGH",
        owner: "toolchain",
        reason: `Tool classified as ${tool.classification.join(", ")}.`,
        suggested_action: "classify_or_bind_tool",
        verification_command: "pnpm run diagnostics:operational:toolchain"
      }));
    }
  }
}

if (!surfaces) {
  gaps.push(gap({
    source_tool: "generate-operational-surface-inventory",
    path: ".diagnostics/operational-journey-factory/surface-inventory.json",
    type: "UNBOUND_SCREEN",
    reason: "Surface inventory missing.",
    suggested_action: "run diagnostics:operational:surfaces",
    verification_command: "pnpm run diagnostics:operational:surfaces"
  }));
} else {
  for (const surface of surfaces.missing_required_surfaces || []) {
    gaps.push(gap({
      source_tool: "surface-inventory",
      path: surface,
      type: "UNBOUND_SCREEN",
      affected_surface: surface,
      reason: "Required surface name was not discovered.",
      suggested_action: "classify_surface_or_justify_exclusion",
      verification_command: "pnpm run diagnostics:operational:surfaces"
    }));
  }
  for (const file of surfaces.direct_api_signs || []) {
    gaps.push(gap({
      source_tool: "surface-inventory",
      path: file,
      type: "DIRECT_API_IN_SURFACE",
      affected_surface: file.split("/").slice(0, 4).join("/"),
      reason: "Surface file contains direct API or runtime config signs.",
      suggested_action: "bind_to_shared_controller_or_adapter",
      verification_command: "pnpm run diagnostics:operational:surfaces"
    }));
  }
  for (const file of surfaces.local_business_logic_candidates || []) {
    gaps.push(gap({
      source_tool: "surface-inventory",
      path: file,
      type: "BUSINESS_LOGIC_IN_SURFACE",
      affected_surface: file.split("/").slice(0, 4).join("/"),
      reason: "Surface file contains operational business logic candidates.",
      suggested_action: "move_or_bind_to_shared_or_backend_owner",
      verification_command: "pnpm run diagnostics:operational:surfaces"
    }));
  }
}

if (!journeys) {
  gaps.push(gap({
    source_tool: "generate-operational-journey-inventory",
    path: ".diagnostics/operational-journey-factory/journey-inventory.json",
    type: "MISSING_BACKEND_ROUTE",
    reason: "Journey inventory missing.",
    suggested_action: "run diagnostics:operational:inventory",
    verification_command: "pnpm run diagnostics:operational:inventory"
  }));
} else {
  for (const [name, item] of Object.entries(journeys.source_files || {})) {
    if (!item.exists) {
      gaps.push(gap({
        source_tool: "journey-inventory",
        path: item.path,
        type: name.includes("openapi") ? "MISSING_OPENAPI_OPERATION" : "UNBOUND_SHARED_CONTROLLER",
        reason: `${name} source file was not found.`,
        suggested_action: "classify_missing_source_or_adjust_factory_source",
        verification_command: "pnpm run diagnostics:operational:inventory"
      }));
    }
  }
}

const ledger = {
  head_sha: headSha(),
  status: "DISCOVERY_ONLY",
  gap_count: gaps.length,
  gaps
};

fs.writeFileSync(path.join(outDir, "gap-ledger.json"), JSON.stringify(ledger, null, 2), "utf8");

const lines = [];
lines.push("# Operational Gap Ledger");
lines.push("");
lines.push(`head_sha: \`${ledger.head_sha}\``);
lines.push("status: `DISCOVERY_ONLY`");
lines.push("");
lines.push("| gap_id | source_tool | path | type | severity | required_action | verification | status | blocks_journey_start |");
lines.push("|---|---|---|---|---|---|---|---|---:|");
for (const item of gaps) {
  lines.push(`| \`${item.gap_id}\` | ${item.source_tool} | \`${item.path}\` | ${item.type} | ${item.severity} | ${item.required_action} | \`${item.verification}\` | ${item.status} | ${item.blocks_journey_start} |`);
}

fs.writeFileSync(path.join(outDir, "gap-ledger.md"), lines.join("\n"), "utf8");
console.log("Operational gap ledger written to .diagnostics/operational-journey-factory");
