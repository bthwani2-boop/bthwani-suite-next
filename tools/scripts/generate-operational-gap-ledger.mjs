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

const REQUIRED_GAP_FIELDS = [
  "gap_id",
  "type",
  "path",
  "owner",
  "affected_surface",
  "affected_journeys",
  "root_cause",
  "pattern_group",
  "risk_level",
  "required_action",
  "target_files",
  "allowed_decision",
  "forbidden_actions",
  "verification_commands",
  "proof_required",
  "status",
  "blocks_journey_start"
];

function ownerForPath(sourcePath, fallback = "foundation") {
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/finance")) return "dsh_finance_read_proxy_consumer";
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/platform")) return "dsh_platform_configuration";
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/operations")) return "dsh_operator_operations";
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/support")) return "dsh_support_incident_operations";
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/catalogs")) return "dsh_catalog_governance";
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/administration")) return "dsh_admin_roles_governance";
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/hr")) return "dsh_hr_governance";
  if (sourcePath.startsWith("services/dsh/frontend/control-panel/partners")) return "dsh_partner_governance";
  if (sourcePath.startsWith("services/dsh/frontend/app-client")) return "dsh_frontend_client_surface";
  if (sourcePath.startsWith("services/dsh/frontend/app-partner")) return "dsh_frontend_partner_surface";
  if (sourcePath.startsWith("services/dsh/frontend/app-field")) return "dsh_frontend_field_surface";
  if (sourcePath.startsWith("services/dsh/frontend/app-captain")) return "dsh_frontend_captain_surface";
  if (sourcePath.startsWith("services/dsh/frontend/shared/finance-wlt-link")) return "dsh_wlt_finance_boundary";
  if (sourcePath.startsWith("services/dsh/frontend/shared")) return "dsh_frontend_shared_brain";
  if (sourcePath.startsWith("services/wlt/frontend/shared/dsh")) return "wlt_dsh_boundary_projection";
  if (sourcePath.startsWith("services/wlt/frontend")) return "wlt_frontend_surface";
  if (sourcePath.startsWith("tools/")) return "toolchain";
  if (sourcePath.includes("openapi") || sourcePath.includes("clients/generated")) return "api-contracts";
  return fallback;
}

function affectedJourneysFor(type, sourcePath) {
  if (sourcePath.includes("finance") || sourcePath.includes("wlt") || sourcePath.includes("commission")) {
    return ["checkout", "payment_handoff", "settlement_read_projection"];
  }
  if (sourcePath.includes("orders") || sourcePath.includes("checkout")) return ["order_lifecycle", "checkout"];
  if (sourcePath.includes("partner") || sourcePath.includes("store")) return ["partner_onboarding", "store_publication"];
  if (sourcePath.includes("platform")) return ["platform_configuration"];
  if (sourcePath.includes("runtime")) return ["runtime_foundation"];
  if (type.startsWith("CI_") || type.includes("TOOL")) return ["operational_foundation"];
  return ["cross_journey_foundation"];
}

function defaultsForType(type, sourcePath) {
  const common = {
    root_cause: "unclassified_foundation_gap",
    pattern_group: "foundation_classification",
    allowed_decision: "FIX_REQUIRED",
    target_files: [sourcePath],
    forbidden_actions: ["delete_without_proof", "move_without_import_proof", "merge_without_duplication_proof"],
    proof_required: ["current_head_sha", "targeted_guard_exit_code"]
  };

  if (type === "BUSINESS_LOGIC_IN_SURFACE") {
    return {
      ...common,
      root_cause: "screen_owns_operational_logic",
      pattern_group: "frontend_surface_logic_extraction",
      allowed_decision: "SPLIT_REFACTOR",
      target_files: [sourcePath, sourcePath.replace(/(?:Screen|Panel|Workspace)\.(tsx|ts)$/, ".controller.$1")],
      forbidden_actions: ["direct_fetch_in_screen", "process_env_in_screen", "business_constants_in_screen"],
      proof_required: ["screen_has_no_fetch", "screen_has_no_process_env", "controller_or_pure_render_proof"]
    };
  }

  if (type === "DIRECT_API_IN_SURFACE") {
    return {
      ...common,
      root_cause: "surface_bypasses_shared_adapter",
      pattern_group: "frontend_api_binding",
      allowed_decision: "BIND_TO_ADAPTER",
      target_files: [sourcePath, "services/dsh/frontend/shared/**"],
      forbidden_actions: ["inline_api_call", "process_env_in_screen", "direct_wlt_mutation_from_dsh_ui"],
      proof_required: ["screen_has_no_fetch", "screen_has_no_base_url", "adapter_or_controller_import_exists"]
    };
  }

  if (type === "SHARED_API_LOGIC_MIXED") {
    return {
      ...common,
      root_cause: "shared_file_mixes_transport_and_domain_logic",
      pattern_group: "shared_transport_domain_split",
      allowed_decision: "SPLIT_REFACTOR",
      forbidden_actions: ["keep_mixed_shared_api_logic", "delete_without_reference_proof"],
      proof_required: ["transport_isolated", "view_model_has_no_fetch", "no_new_circular_dependency"]
    };
  }

  if (type === "DIRECT_API_IN_SHARED_UNCLASSIFIED") {
    return {
      ...common,
      root_cause: "shared_direct_api_file_has_unclear_role",
      pattern_group: "shared_runtime_adapter_classification",
      allowed_decision: "KEEP_WITH_PROOF_OR_RENAME",
      forbidden_actions: ["leave_unclassified_direct_api", "delete_without_reference_proof"],
      proof_required: ["classified_as_adapter_client_transport_or_runtime", "runtime_config_guard_passes"]
    };
  }

  if (type === "CI_NOT_PROVEN" || type === "CI_WEAKLY_BOUND") {
    return {
      ...common,
      root_cause: "toolchain_execution_not_proven",
      pattern_group: "toolchain_binding",
      allowed_decision: type === "CI_NOT_PROVEN" ? "BLOCKED_NEEDS_TOOL" : "FIX_REQUIRED",
      target_files: ["package.json", "tools/toolchain/**", "tools/scripts/**", ".github/workflows/**"],
      forbidden_actions: ["mark_pass_without_command", "ignore_active_fail_policy_tool"],
      proof_required: ["command_record_has_classification", "tool_activation_policy_respected"]
    };
  }

  return common;
}

function normalizeVerification(command) {
  if (Array.isArray(command)) return command.filter(Boolean);
  if (typeof command === "string" && command.trim()) return [command.trim()];
  return ["pnpm run diagnostics:operational:gaps"];
}

function gap({ source_tool, path: sourcePath, type, severity = "HIGH", journey = "factory", affected_surface = "multi-surface", owner = "unassigned", reason, suggested_action, verification_command, blocks_journey_start = true }) {
  const normalizedOwner = owner === "unassigned" ? ownerForPath(sourcePath) : owner;
  const typeDefaults = defaultsForType(type, sourcePath);
  const verificationCommands = normalizeVerification(verification_command);
  const riskLevel = severity === "CRITICAL" ? "P0" : severity === "HIGH" ? "P1" : "P2";

  return {
    gap_id: `${type}:${sourcePath}`.replace(/[^A-Za-z0-9:_./-]/g, "_"),
    type,
    source_tool,
    path: sourcePath,
    reason,
    severity,
    risk_level: riskLevel,
    journey,
    affected_journeys: affectedJourneysFor(type, sourcePath),
    affected_surface,
    owner: normalizedOwner,
    root_cause: typeDefaults.root_cause,
    pattern_group: typeDefaults.pattern_group,
    required_action: suggested_action,
    target_files: typeDefaults.target_files,
    allowed_decision: typeDefaults.allowed_decision,
    forbidden_actions: typeDefaults.forbidden_actions,
    verification_commands: verificationCommands,
    proof_required: typeDefaults.proof_required,
    decision: blocks_journey_start ? "BLOCKED_NEEDS_EVIDENCE" : "FIX_REQUIRED",
    verification: verificationCommands.join(" && "),
    status: "OPEN",
    blocks_journey_start
  };
}

function isAllowedSharedDirectApiFile(file) {
  return /\.(api|client|transport|adapter|runtime)\.(ts|tsx|js|jsx)$/.test(file)
    || /-(client|transport|adapter|runtime-adapter)\.(ts|tsx|js|jsx)$/.test(file)
    || /\/use-[^/]*controller\.(ts|tsx|js|jsx)$/.test(file)
    || /(http|request|http-request)\.(ts|tsx|js|jsx)$/.test(file)
    || /api-base-url\.(ts|tsx|js|jsx)$/.test(file)
    || /\/shared\/platform\/(feature-flags|platform-vars)\.(ts|tsx|js|jsx)$/.test(file)
    || /\/shared\/runtime\/.*\.(ts|tsx|js|jsx)$/.test(file)
    || /\/shared\/media\/(field-document-media|resolve-dev-media-url)\.(ts|tsx|js|jsx)$/.test(file)
    || /\/_kernel\/.*(http|request|api-base-url).*\.(ts|tsx|js|jsx)$/.test(file);
}

function assessTool(tool) {
  const classification = tool.classification || [];
  const activation = tool.activation || "optional";
  const failurePolicy = tool.failure_policy || "manual";

  const hasActiveFail = classification.includes("ACTIVE_FAIL") || classification.includes("BLOCKED_NEEDS_TOOL");
  const hasMissingScript = classification.includes("MISSING_SCRIPT");
  const hasUnmapped = classification.includes("UNMAPPED_TOOL");
  const hasActiveWarn = classification.includes("ACTIVE_WARN") || classification.includes("FIX_REQUIRED");

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
        if (isAllowedSharedDirectApiFile(file)) continue;

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
  required_gap_fields: REQUIRED_GAP_FIELDS,
  gap_count: gaps.length,
  gaps
};

// Inject UI Binding Gaps if available
const uiBindingPath = path.join(outDir, "dsh-order-ui-binding-inventory.json");
if (fs.existsSync(uiBindingPath)) {
  try {
    const uiData = JSON.parse(fs.readFileSync(uiBindingPath, "utf8"));
    if (uiData.gaps && uiData.gaps.length > 0) {
      for (const ug of uiData.gaps) {
        ledger.gaps.push({
          gap_id: ug.gap_id,
          type: ug.type,
          source_tool: "ui-binding-audit",
          path: ug.path,
          reason: ug.reason,
          severity: ug.severity,
          risk_level: ug.risk_level,
          journey: ug.journey,
          affected_journeys: [ug.journey],
          affected_surface: ug.path,
          owner: "toolchain",
          root_cause: "unbound_ui_element",
          pattern_group: "ui_binding",
          required_action: "Bind element or add accessibility label",
          target_files: [ug.path],
          allowed_decision: "FIX_REQUIRED",
          forbidden_actions: ["leave_unbound"],
          verification_commands: ["pnpm run diagnostics:operational:gaps"],
          proof_required: ["zero binding gaps in ui-binding audit"],
          status: "OPEN",
          blocks_journey_start: true
        });
      }
    }
  } catch (e) {
    console.error("Failed to inject UI binding gaps:", e.message);
  }
}

ledger.gap_count = ledger.gaps.length;

fs.writeFileSync(path.join(outDir, "gap-ledger.json"), JSON.stringify(ledger, null, 2), "utf8");

