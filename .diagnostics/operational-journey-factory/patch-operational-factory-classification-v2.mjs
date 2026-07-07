import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const surfaceScript = "tools/scripts/generate-operational-surface-inventory.mjs";
const gapScript = "tools/scripts/generate-operational-gap-ledger.mjs";
const toolchainScript = "tools/scripts/generate-operational-toolchain-inventory.mjs";mmfunction abs(rel) {m  return path.join(repoRoot, rel);m}mmfunction read(rel) {m  return fs.readFileSync(abs(rel), "utf8");m}mmfunction write(rel, content) {m  fs.writeFileSync(abs(rel), content, "utf8");m}mmfunction replaceOnce(rel, before, after) {m  const content = read(rel);m  if (!content.includes(before)) {m    throw new Error("Anchor not found in " + rel + ":\n" + before.slice(0, 300));m  }m  write(rel, content.replace(before, after));m}mmfunction replaceBetween(rel, startMarker, endMarker, replacement) {m  const content = read(rel);m  const start = content.indexOf(startMarker);m  if (start < 0) throw new Error("Start marker not found in " + rel + ": " + startMarker);mm  const end = content.indexOf(endMarker, start);m  if (end < 0) throw new Error("End marker not found in " + rel + ": " + endMarker);mm  const next = content.slice(0, start) + replacement + content.slice(end);m  write(rel, next);m}mm/* ============================================================m   1) Surface inventory: classify layer kindm   ============================================================ */mmreplaceOnce(m  surfaceScript,m`function classifyFile(file) {m  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");`,m`const uiSurfaceRoots = [m  "services/dsh/frontend/app-client",m  "services/dsh/frontend/app-partner",m  "services/dsh/frontend/app-field",m  "services/dsh/frontend/app-captain",m  "services/dsh/frontend/control-panel",m  "services/wlt/frontend/app-client",m  "services/wlt/frontend/app-partner",m  "services/wlt/frontend/app-field",m  "services/wlt/frontend/app-captain",m  "services/wlt/frontend/control-panel"m];mmconst sharedBrainRoots = [m  "services/dsh/frontend/shared",m  "services/wlt/frontend/shared"m];mmfunction rootMatches(file, root) {m  return file === root || file.startsWith(root + "/");m}mmfunction existingRoot(root) {m  return fs.existsSync(path.join(repoRoot, root));m}mmfunction classifyOwner(file) {m  for (const root of sharedBrainRoots) {m    if (rootMatches(file, root)) return { kind: "shared_brain", surface: root };m  }mm  for (const root of uiSurfaceRoots) {m    if (rootMatches(file, root)) return { kind: "ui_surface", surface: root };m  }mm  const runtimeMatch = file.match(/^apps\\/([^/]+)\\/runtime(?:\\/|$)/);m  if (runtimeMatch) return { kind: "runtime_shell", surface: "apps/" + runtimeMatch[1] + "/runtime" };mm  if (rootMatches(file, "shared/ui-kit")) return { kind: "ui_kit", surface: "shared/ui-kit" };mm  return { kind: "other", surface: file.split("/").slice(0, 4).join("/") };m}mmconst requiredUiSurfaces = uiSurfaceRoots.filter(existingRoot);mmfunction classifyFile(file) {m  const owner = classifyOwner(file);m  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");`m);mmreplaceOnce(m  surfaceScript,m`    surface: file.split("/").slice(0, 4).join("/"),`,m`    surface: owner.surface,m    kind: owner.kind,`m);mmreplaceOnce(m  surfaceScript,m`  const current = surfaces.get(item.surface) || {m    surface: item.surface,m    files: 0,`,m`  const current = surfaces.get(item.surface) || {m    surface: item.surface,m    kind: item.kind,m    files: 0,`m);mmreplaceOnce(m  surfaceScript,m`const requiredSurfaces = ["app-client", "app-partner", "app-captain", "app-field", "control-panel"];mconst surfaceText = Array.from(surfaces.keys()).join("\\n");mconst missingRequiredSurfaces = requiredSurfaces.filter((surface) => !surfaceText.includes(surface));`,m`const discoveredUiSurfaces = new Set(m  Array.from(surfaces.values())m    .filter((surface) => surface.kind === "ui_surface")m    .map((surface) => surface.surface)m);mconst missingRequiredSurfaces = requiredUiSurfaces.filter((surface) => !discoveredUiSurfaces.has(surface));`m);mmreplaceOnce(m  surfaceScript,m`lines.push("| Surface | Files | Screens | Pages | Routes | Direct API signs | Local logic candidates | UI/action candidates | State candidates |");mlines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");`,m`lines.push("| Kind | Surface | Files | Screens | Pages | Routes | Direct API signs | Local logic candidates | UI/action candidates | State candidates |");mlines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");`m);mmreplaceOnce(m  surfaceScript,m`  lines.push(\`| \\\`\${surface.surface}\\\` | \${surface.files} | \${surface.screens.length} | \${surface.pages.length} | \${surface.route_bindings.length} | \${surface.direct_api_signs.length} | \${surface.local_business_logic_candidates.length} | \${surface.icons_components_actions_candidates} | \${surface.states_candidates} |\`);`,m`  lines.push(\`| \${surface.kind} | \\\`\${surface.surface}\\\` | \${surface.files} | \${surface.screens.length} | \${surface.pages.length} | \${surface.route_bindings.length} | \${surface.direct_api_signs.length} | \${surface.local_business_logic_candidates.length} | \${surface.icons_components_actions_candidates} | \${surface.states_candidates} |\`);`m);mm/* ============================================================m   2) Gap ledger: add type and filter by kindm   ============================================================ */mmreplaceOnce(m  gapScript,m`    gap_id: \`\${type}:\${sourcePath}\`.replace(/[^A-Za-z0-9:_./-]/g, "_"),m    source_tool,`,m`    gap_id: \`\${type}:\${sourcePath}\`.replace(/[^A-Za-z0-9:_./-]/g, "_"),m    type,m    source_tool,`m);mmreplaceOnce(m  gapScript,m`const toolchain = readJson("toolchain-inventory.json", null);`,m`function isAllowedSharedDirectApiFile(file) {m  return /\\.(api|client|transport)\\.(ts|tsx|js|jsx)$/.test(file)m    || /\\/_kernel\\/.*(http|request|api-base-url).*\\.(ts|tsx|js|jsx)$/.test(file);m}mmfunction assessTool(tool) {m  const classification = tool.classification || [];m  const activation = tool.activation || "optional";m  const failurePolicy = tool.failure_policy || "manual";mm  const hasActiveFail = classification.includes("ACTIVE_FAIL");m  const hasMissingScript = classification.includes("MISSING_SCRIPT");m  const hasUnmapped = classification.includes("UNMAPPED_TOOL");m  const hasActiveWarn = classification.includes("ACTIVE_WARN");mm  if (hasActiveFail || hasMissingScript || (activation === "active" && failurePolicy === "fail" && hasUnmapped)) {m    return {m      emit: true,m      blocks: true,m      severity: hasActiveFail ? "CRITICAL" : "HIGH",m      type: "CI_NOT_PROVEN",m      reason: "Tool classified as " + classification.join(", ") + "."m    };m  }mm  if (activation === "active" && failurePolicy === "fail" && hasActiveWarn) {m    return {m      emit: true,m      blocks: false,m      severity: "HIGH",m      type: "CI_WEAKLY_BOUND",m      reason: "Active fail-policy tool is weakly bound: " + classification.join(", ") + "."m    };m  }mm  return { emit: false, blocks: false, severity: "LOW", type: "TOOL_METADATA", reason: "" };m}mmconst toolchain = readJson("toolchain-inventory.json", null);`m);mmreplaceOnce(m  gapScript,m`  for (const tool of toolchain.tools || []) {m    if ((tool.classification || []).some((item) => ["ACTIVE_FAIL", "MISSING_SCRIPT", "UNMAPPED_TOOL", "NEEDS_OWNER"].includes(item))) {m      gaps.push(gap({m        source_tool: "toolchain-inventory",m        path: tool.tool_id,m        type: "CI_NOT_PROVEN",m        severity: tool.classification.includes("ACTIVE_FAIL") ? "CRITICAL" : "HIGH",m        owner: "toolchain",m        reason: \`Tool classified as \${tool.classification.join(", ")}.\`,m        suggested_action: "classify_or_bind_tool",m        verification_command: "pnpm run diagnostics:operational:toolchain"m      }));m    }m  }`,m`  for (const tool of toolchain.tools || []) {m    const assessment = assessTool(tool);m    if (!assessment.emit) continue;mm    gaps.push(gap({m      source_tool: "toolchain-inventory",m      path: tool.tool_id,m      type: assessment.type,m      severity: assessment.severity,m      owner: "toolchain",m      reason: assessment.reason,m      suggested_action: assessment.blocks ? "classify_or_bind_tool" : "strengthen_tool_binding_or_document_workflow_evidence",m      verification_command: "pnpm run diagnostics:operational:toolchain",m      blocks_journey_start: assessment.blocksm    }));m  }`m);mmreplaceOnce(m  gapScript,m`  for (const file of surfaces.direct_api_signs || []) {m    gaps.push(gap({m      source_tool: "surface-inventory",m      path: file,m      type: "DIRECT_API_IN_SURFACE",m      affected_surface: file.split("/").slice(0, 4).join("/"),m      reason: "Surface file contains direct API or runtime config signs.",m      suggested_action: "bind_to_shared_controller_or_adapter",m      verification_command: "pnpm run diagnostics:operational:surfaces"m    }));m  }m  for (const file of surfaces.local_business_logic_candidates || []) {m    gaps.push(gap({m      source_tool: "surface-inventory",m      path: file,m      type: "BUSINESS_LOGIC_IN_SURFACE",m      affected_surface: file.split("/").slice(0, 4).join("/"),m      reason: "Surface file contains operational business logic candidates.",m      suggested_action: "move_or_bind_to_shared_or_backend_owner",m      verification_command: "pnpm run diagnostics:operational:surfaces"m    }));m  }`,m`  const surfaceEntries = surfaces.surfaces || [];mm  for (const surface of surfaceEntries) {m    const directApiFiles = surface.direct_api_signs || [];m    const localLogicFiles = surface.local_business_logic_candidates || [];m    const localLogicSet = new Set(localLogicFiles);mm    if (surface.kind === "ui_surface") {
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
  }`
);

replaceOnce(
  gapScript,
`const ledger = {
  head_sha: headSha(),`,
`if (journeys && (journeys.openapi_files || []).length > 0 && (journeys.generated_clients || []).length === 0) {
  gaps.push(gap({
    source_tool: "journey-inventory",
    path: "clients/generated",
    type: "MISSING_GENERATED_CLIENTS",
    severity: "CRITICAL",
    journey: "factory",
    affected_surface: "multi-surface",
    owner: "api-contracts",
    reason: "OpenAPI files exist but generated clients were not discovered.",
    suggested_action: "run_openapi_generate_or_fix_generated_client_detection",
    verification_command: "pnpm run openapi:generate && pnpm run diagnostics:operational:inventory",
    blocks_journey_start: true
  }));
}

const ledger = {
  head_sha: headSha(),`
);

/* ============================================================
   3) Toolchain inventory: workflow-only tools are valid binding
   ============================================================ */

replaceBetween(
  toolchainScript,
`function classify(entry) {`,
`const tools = (catalog.entries || []).map(classify);`,
`function workflowEvidenceFor(entry, command) {
  const id = String(entry.id || "").toLowerCase();
  const workflowTextLower = workflowText.toLowerCase();
  const commandNeedle = String(command || "").toLowerCase();

  const byCommand = Boolean(commandNeedle)
    && (workflowTextLower.includes(commandNeedle) || workflowTextLower.includes("pnpm run " + commandNeedle));

  const byFileName = workflowFiles.some((rel) => path.basename(rel).toLowerCase().includes(id));
  const byWorkflowName = workflowTextLower.includes("name: " + id) || workflowTextLower.includes("name: \\"" + id + "\\"");
  const byAction = workflowTextLower.includes(id + "-action") || workflowTextLower.includes("/" + id) || workflowTextLower.includes(id + " scan");

  return {
    workflow_found: byCommand || byFileName || byWorkflowName || byAction,
    evidence: [
      byCommand ? "workflow_command" : "",
      byFileName ? "workflow_filename" : "",
      byWorkflowName ? "workflow_name" : "",
      byAction ? "workflow_action_or_step" : ""
    ].filter(Boolean)
  };
}

function classify(entry) {
  const activation = baseline[entry.id] || entry.activation || "optional";
  const command = commandFor(entry);
  const hasPackageScript = command ? scriptValues.has(command) : false;
  const hasVirtualScript = command ? command.startsWith("github/") || command === "sonarqube" : false;
  const workflow = workflowEvidenceFor(entry, command);
  const hasExecutionBinding = hasPackageScript || hasVirtualScript || workflow.workflow_found;
  const statuses = [];

  if (activation === "active" && entry.failure_policy === "fail" && !hasExecutionBinding) {
    statuses.push("ACTIVE_FAIL");
  }

  if (activation === "active" && entry.failure_policy === "fail" && hasExecutionBinding && command && !workflow.workflow_found) {
    statuses.push("ACTIVE_WARN");
  }

  if (activation === "partial") statuses.push("PARTIAL");
  if (activation === "optional") statuses.push("OPTIONAL");
  if (command && command.startsWith("guard:") && !scriptValues.has(command)) statuses.push("MISSING_SCRIPT");
  if (!baseline[entry.id]) statuses.push("UNMAPPED_TOOL");
  if (!command && workflow.workflow_found) statuses.push("WORKFLOW_ONLY");
  if (!entry.owner && !entry.team) statuses.push("NEEDS_OWNER");
  if (statuses.length === 0) statuses.push("ACTIVE_BOUND");

  return {
    tool_id: entry.id,
    category: entry.category || "unknown",
    activation,
    failure_policy: entry.failure_policy || "manual",
    command,
    script_found: hasPackageScript || hasVirtualScript,
    workflow_found: workflow.workflow_found,
    workflow_evidence: workflow.evidence,
    detected_from: ["tools/toolchain/tool-catalog.v5.json", "tools/toolchain/tool-activation-baseline.json"],
    classification: statuses
  };
}

const tools = (catalog.entries || []).map(classify);`
);

console.log("Factory generator patches applied.");
