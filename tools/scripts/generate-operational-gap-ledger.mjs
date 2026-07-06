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
    type,
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

function isAllowedSharedDirectApiFile(file) {
  return /\.(api|client|transport)\.(ts|tsx|js|jsx)$/.test(file)
    || /\/_kernel\/.*(http|request|api-base-url).*\.(ts|tsx|js|jsx)$/.test(file);
}

function assessTool(tool) {
  const classification = tool.classification || [];
  const activation = tool.activation || "optional";
  const failurePolicy = tool.failure_policy || "manual";

  const hasActiveFail = classification.includes("ACTIVE_FAIL");
  const hasMissingScript = classification.includes("MISSING_SCRIPT");
  const hasUnmapped = classification.includes("UNMAPPED_TOOL");
  const hasActiveWarn = classification.includes("ACTIVE_WARN");

  if (hasActiveFail || hasMissingScript || (activation === "active" && failurePolicy === "fail" && hasUnmapped)) {
    return {
      emit: true,
      blocks: true,
      severity: hasActiveFail ? "CRITICAL" : "HIGH",
      type: "CI_NOT_PROVEN",
      reason: `Tool classified as ${classification.join(", ")}.`
    };
  }

  if (activation === "active" && failurePolicy === "fail" && hasActiveWarn) {
    return {
      emit: true,
      blocks: false,
      severity: "HIGH",
      type: "CI_WEAKLY_BOUND",
      reason: `Active fail-policy tool is weakly bound: ${classification.join(", ")}.`
    };
  }

  return { emit: false, blocks: false, severity: "LOW", type: "TOOL_METADATA", reason: "" };
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
    const assessment = assessTool(tool);
    if (!assessment.emit) continue;

    gaps.push(gap({
      source_tool: "toolchain-inventory",
      path: tool.tool_id,
      type: assessment.type,
      severity: assessment.severity,
      owner: "toolchain",
      reason: assessment.reason,
      suggested_action: assessment.blocks ? "classify_or_bind_tool" : "strengthen_tool_binding_or_document_workflow_evidence",
      verification_command: "pnpm run diagnostics:operational:toolchain",
      blocks_journey_start: assessment.blocks
    }));
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
      reason: "Required UI surface was not discovered.",
      suggested_action: "classify_surface_or_justify_exclusion",
      verification_command: "pnpm run diagnostics:operational:surfaces"
    }));
  }

  for (const surface of surfaces.surfaces || []) {
    const directApiFiles = surface.direct_api_signs || [];
    const localLogicFiles = surface.local_business_logic_candidates || [];
    const localLogicSet = new Set(localLogicFiles);

    if (surface.kind === "ui_surface") {
      for (const file of directApiFiles) {
        gaps.push(gap({
          source_tool: "surface-inventory",
          path: file,
          type: "DIRECT_API_IN_SURFACE",
          affected_surface: surface.surface,
          reason: "UI surface file contains direct API or runtime config signs.",
          suggested_action: "bind_to_shared_controller_or_adapter",
          verification_command: "pnpm run diagnostics:operational:surfaces"
        }));
      }

      for (const file of localLogicFiles) {
        gaps.push(gap({
          source_tool: "surface-inventory",
          path: file,
          type: "BUSINESS_LOGIC_IN_SURFACE",
          affected_surface: surface.surface,
          reason: "UI surface file contains operational business logic candidates.",
          suggested_action: "move_or_bind_to_shared_or_backend_owner",
          verification_command: "pnpm run diagnostics:operational:surfaces"
        }));
      }

      continue;
    }

    if (surface.kind === "shared_brain") {
      for (const file of directApiFiles) {
        if (isAllowedSharedDirectApiFile(file) && !localLogicSet.has(file)) continue;

        gaps.push(gap({
          source_tool: "surface-inventory",
          path: file,
          type: localLogicSet.has(file) ? "SHARED_API_LOGIC_MIXED" : "DIRECT_API_IN_SHARED_UNCLASSIFIED",
          severity: localLogicSet.has(file) ? "HIGH" : "MEDIUM",
          affected_surface: surface.surface,
          owner: "shared_brain",
          reason: localLogicSet.has(file)
            ? "Shared file mixes runtime API access with operational/domain logic candidates."
            : "Shared file contains direct API signs but is not named as adapter/client/transport/kernel.",
          suggested_action: localLogicSet.has(file)
            ? "split_transport_from_shared_domain_logic"
            : "rename_or_move_to_shared_adapter_or_kernel",
          verification_command: "pnpm run diagnostics:operational:surfaces",
          blocks_journey_start: localLogicSet.has(file)
        }));
      }
    }
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

  if ((journeys.openapi_files || []).length > 0 && (journeys.generated_clients || []).length === 0) {
    gaps.push(gap({
      source_tool: "journey-inventory",
      path: "clients/generated",
      type: "MISSING_GENERATED_CLIENTS",
      severity: "CRITICAL",
      affected_surface: "multi-surface",
      owner: "api-contracts",
      reason: "OpenAPI files exist but generated clients were not discovered.",
      suggested_action: "run_openapi_generate_or_fix_generated_client_detection",
      verification_command: "pnpm run openapi:generate && pnpm run diagnostics:operational:inventory",
      blocks_journey_start: true
    }));
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
