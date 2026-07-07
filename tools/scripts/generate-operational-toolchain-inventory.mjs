import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repoRoot } from "../guards/_guard-utils.mjs";

const outDir = path.join(repoRoot, ".diagnostics", "operational-journey-factory");
fs.mkdirSync(outDir, { recursive: true });

function toPosix(value) {
  return value.replaceAll(path.sep, "/");
}

function headSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "HEAD_UNAVAILABLE";
  }
}

function readJson(rel, fallback) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function listDir(rel, predicate = () => true) {
  const dir = path.join(repoRoot, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(predicate)
    .map((name) => `${rel}/${name}`);
}

function readWorkflowText() {
  return listDir(".github/workflows", (name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8"))
    .join("\n");
}

const packageJson = readJson("package.json", { scripts: {} });
const scripts = packageJson.scripts || {};
const catalog = readJson("tools/toolchain/tool-catalog.v5.json", { entries: [] });
const baseline = readJson("tools/toolchain/tool-activation-baseline.json", { baseline: {} }).baseline || {};
const expected = readJson("tools/toolchain/expected-tool-ids.v5.json", { expected_tools: [] }).expected_tools || [];
const guardRegistry = readJson("governance/guards/guard-registry.json", { entries: [] });
const workflowText = readWorkflowText();
const workflowTextLower = workflowText.toLowerCase();
const guardFiles = listDir("tools/guards", (name) => name.endsWith(".mjs") || name.endsWith(".go"));
const scriptFiles = listDir("tools/scripts", (name) => name.endsWith(".mjs") || name.endsWith(".ps1") || name.endsWith(".sh"));
const workflowFiles = listDir(".github/workflows", (name) => name.endsWith(".yml") || name.endsWith(".yaml"));

const scriptValues = new Set(Object.keys(scripts));
const registryScripts = new Set((guardRegistry.entries || []).map((entry) => entry.script).filter(Boolean));
const catalogEntries = new Map((catalog.entries || []).map((entry) => [entry.id, entry]));

function commandFor(entry) {
  return entry.package_script || entry.fulfilled_by || "";
}

function commandDisplay(command) {
  return command || "NO_COMMAND_DECLARED";
}

function commandClassification({ activation, failurePolicy, hasExecutionBinding, command, workflow }) {
  if (!command) {
    if (workflow.workflow_found) return "EXTERNAL_CI_WORKFLOW_ONLY";
    return activation === "active" && failurePolicy === "fail"
      ? "BLOCKED_NEEDS_TOOL"
      : "NOT_REQUIRED_NO_COMMAND";
  }
  if (!hasExecutionBinding) return "BLOCKED_NEEDS_TOOL";
  if (!workflow.workflow_found && activation === "active" && failurePolicy === "fail") return "FIX_REQUIRED";
  return "DISCOVERY_ONLY_NOT_EXECUTED";
}

function commandRecord({ id, command, tool, blocking, classification, remediationHint }) {
  return {
    id,
    command: commandDisplay(command),
    tool,
    expected_exit_code: 0,
    actual_exit_code: null,
    blocking,
    classification,
    log_path: ".diagnostics/operational-journey-factory/toolchain-inventory.json",
    remediation_hint: remediationHint
  };
}

function workflowEvidenceFor(entry, command) {
  const id = String(entry.id || "").toLowerCase();
  const commandNeedle = String(command || "").toLowerCase();

  const byCommand = Boolean(commandNeedle)
    && (workflowTextLower.includes(commandNeedle) || workflowTextLower.includes(`pnpm run ${commandNeedle}`));

  const byFileName = workflowFiles.some((rel) => path.basename(rel).toLowerCase().includes(id));
  const byWorkflowName = workflowTextLower.includes(`name: ${id}`) || workflowTextLower.includes(`name: "${id}"`);
  const byAction = workflowTextLower.includes(`${id}-action`) || workflowTextLower.includes(`/${id}`) || workflowTextLower.includes(`${id} scan`);

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
  const failurePolicy = entry.failure_policy || "manual";
  const hasPackageScript = command ? scriptValues.has(command) : false;
  const hasVirtualScript = command ? command.startsWith("github/") || command === "sonarqube" : false;
  const workflow = workflowEvidenceFor(entry, command);
  const hasExecutionBinding = hasPackageScript || hasVirtualScript || workflow.workflow_found;
  const statuses = [];

  if (activation === "active" && failurePolicy === "fail" && !hasExecutionBinding) {
    statuses.push("BLOCKED_NEEDS_TOOL");
  }

  if (activation === "active" && failurePolicy === "fail" && hasExecutionBinding && command && !workflow.workflow_found) {
    statuses.push("FIX_REQUIRED");
  }

  if (activation === "partial") statuses.push("PARTIAL");
  if (activation === "optional") statuses.push("OPTIONAL");
  if (command && command.startsWith("guard:") && !scriptValues.has(command)) statuses.push("MISSING_SCRIPT");
  if (!baseline[entry.id]) statuses.push("UNMAPPED_TOOL");
  if (!command && workflow.workflow_found) statuses.push("WORKFLOW_ONLY");
  if (!entry.owner && !entry.team) statuses.push("NEEDS_OWNER");
  if (statuses.length === 0) statuses.push("ACTIVE_BOUND");
  const primaryClassification = commandClassification({
    activation,
    failurePolicy,
    hasExecutionBinding,
    command,
    workflow
  });
  const blocking = activation === "active"
    && failurePolicy === "fail"
    && !["DISCOVERY_ONLY_NOT_EXECUTED", "EXTERNAL_CI_WORKFLOW_ONLY"].includes(primaryClassification);

  return {
    tool_id: entry.id,
    category: entry.category || "unknown",
    activation,
    failure_policy: failurePolicy,
    command: commandDisplay(command),
    script_found: hasPackageScript || hasVirtualScript,
    workflow_found: workflow.workflow_found,
    workflow_evidence: workflow.evidence,
    detected_from: ["tools/toolchain/tool-catalog.v5.json", "tools/toolchain/tool-activation-baseline.json"],
    classification: statuses,
    commands: [
      commandRecord({
        id: `${entry.id}:primary`,
        command,
        tool: entry.id,
        blocking,
        classification: primaryClassification,
        remediationHint: primaryClassification === "BLOCKED_NEEDS_TOOL"
          ? "bind_or_install_required_tool"
          : primaryClassification === "EXTERNAL_CI_WORKFLOW_ONLY"
            ? "collect_external_ci_run_evidence_for_closure"
          : primaryClassification === "FIX_REQUIRED"
            ? "add_workflow_evidence_or_adjust_activation_policy"
            : "no_execution_required_for_discovery_inventory"
      })
    ]
  };
}

const tools = (catalog.entries || []).map(classify);

for (const id of expected) {
  if (!catalogEntries.has(id)) {
    tools.push({
      tool_id: id,
      category: "expected",
      activation: baseline[id] || "missing",
      failure_policy: "block journey start",
      command: "NO_COMMAND_DECLARED",
      script_found: false,
      workflow_found: false,
      workflow_evidence: [],
      detected_from: ["tools/toolchain/expected-tool-ids.v5.json"],
      classification: ["BLOCKED_NEEDS_TOOL"],
      commands: [
        commandRecord({
          id: `${id}:primary`,
          command: "",
          tool: id,
          blocking: true,
          classification: "BLOCKED_NEEDS_TOOL",
          remediationHint: "add_tool_catalog_entry_and_package_or_workflow_binding"
        })
      ]
    });
  }
}

const toolCommands = new Set(tools.map((tool) => tool.command).filter((command) => command && command !== "NO_COMMAND_DECLARED"));
const unusedScripts = Object.keys(scripts)
  .filter((name) => !toolCommands.has(name) && !registryScripts.has(name))
  .filter((name) => name.startsWith("guard:") || name.startsWith("diagnostics:"));

const inventory = {
  head_sha: headSha(),
  status: "DISCOVERY_ONLY",
  output_policy: ".diagnostics/operational-journey-factory",
  sources: {
    package_json_scripts: Object.keys(scripts).length,
    guard_registry_entries: (guardRegistry.entries || []).length,
    guard_files: guardFiles.map(toPosix),
    script_files: scriptFiles.map(toPosix),
    workflow_files: workflowFiles.map(toPosix)
  },
  tools,
  unused_scripts: unusedScripts.map((name) => ({
    tool_id: name,
    classification: ["UNUSED_SCRIPT"],
    detected_from: ["package.json"],
    command: name,
    commands: [
      commandRecord({
        id: `${name}:package-script`,
        command: name,
        tool: name,
        blocking: false,
        classification: "FIX_REQUIRED",
        remediationHint: "classify_package_script_or_register_guard"
      })
    ]
  }))
};

fs.writeFileSync(path.join(outDir, "toolchain-inventory.json"), JSON.stringify(inventory, null, 2), "utf8");

const lines = [];
lines.push("# Operational Toolchain Inventory");
lines.push("");
lines.push(`head_sha: \`${inventory.head_sha}\``);
lines.push("status: `DISCOVERY_ONLY`");
lines.push("");
lines.push("| Tool | Activation | Command | Classification |");
lines.push("|---|---|---|---|");
for (const tool of tools) {
  lines.push(`| \`${tool.tool_id}\` | ${tool.activation} | \`${tool.command}\` | ${tool.classification.join(", ")} |`);
}
lines.push("");
lines.push("## Unused Guard Or Diagnostic Scripts");
for (const item of inventory.unused_scripts) {
  lines.push(`- \`${item.tool_id}\`: ${item.classification.join(", ")}`);
}

fs.writeFileSync(path.join(outDir, "toolchain-inventory.md"), lines.join("\n"), "utf8");
console.log("Operational toolchain inventory written to .diagnostics/operational-journey-factory");
