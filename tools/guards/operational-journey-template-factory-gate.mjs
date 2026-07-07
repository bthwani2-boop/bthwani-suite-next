import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "operational-journey-template-factory-gate";
const violations = [];
const factoryDir = path.join(repoRoot, "governance/operational_journey_factory");

const requiredTemplates = [
  "00_FACTORY_INDEX.md",
  "01_TOTAL_DISCOVERY_PROTOCOL.md",
  "02_ATOMIC_SCOPE_TEMPLATE.md",
  "03_ATOMIC_FILE_DECISION_TEMPLATE.md",
  "04_SURFACE_TEMPLATE.md",
  "05_FEATURE_TEMPLATE.md",
  "06_BACKEND_API_DATABASE_TEMPLATE.md",
  "07_FRONTEND_BINDING_TEMPLATE.md",
  "08_UI_ICON_COMPONENT_TEMPLATE.md",
  "09_PERMISSION_STATE_AUDIT_TEMPLATE.md",
  "10_RUNTIME_DOCKER_ENV_TEMPLATE.md",
  "11_TOOLCHAIN_EXECUTION_TEMPLATE.md",
  "12_CLEANUP_MOVE_MERGE_DELETE_TEMPLATE.md",
  "13_EVIDENCE_AND_CLOSURE_TEMPLATE.md",
  "14_JOURNEY_TEMPLATE_MASTER.md",
  "15_GAP_LEDGER_TEMPLATE.md",
  "16_TEMPLATE_FILLING_RULES.md",
  "17_GENERATOR_OUTPUT_POLICY.md"
];

const requiredScripts = [
  "tools/scripts/generate-operational-journey-inventory.mjs",
  "tools/scripts/generate-operational-toolchain-inventory.mjs",
  "tools/scripts/generate-operational-surface-inventory.mjs",
  "tools/scripts/generate-operational-gap-ledger.mjs",
  "tools/guards/operational-journey-template-factory-gate.mjs"
];

const requiredChecklist = "tools/checklist/operational-journey-factory-checklist.md";

const requiredPackageScripts = {
  "diagnostics:operational:inventory": "node tools/scripts/generate-operational-journey-inventory.mjs",
  "diagnostics:operational:toolchain": "node tools/scripts/generate-operational-toolchain-inventory.mjs",
  "diagnostics:operational:surfaces": "node tools/scripts/generate-operational-surface-inventory.mjs",
  "diagnostics:operational:gaps": "node tools/scripts/generate-operational-gap-ledger.mjs",
  "guard:operational-journey-factory": "node tools/guards/operational-journey-template-factory-gate.mjs"
};

const requiredGapFields = [
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

const requiredCommandFields = [
  "id",
  "command",
  "tool",
  "expected_exit_code",
  "actual_exit_code",
  "blocking",
  "classification",
  "log_path",
  "remediation_hint"
];

function readJson(rel, fallback) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readFactory(file) {
  const full = path.join(factoryDir, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function requireText(file, needles) {
  const content = readFactory(file);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      violations.push({ file: `governance/operational_journey_factory/${file}`, line: 0, message: `MISSING_REQUIRED_TEXT: ${needle}` });
    }
  }
}

function isEmptyRequiredValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "" || value === "undefined" || value === "unknown command";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validateCommandRecord(command, file, index) {
  for (const field of requiredCommandFields) {
    if (!(field in command) || isEmptyRequiredValue(command[field])) {
      if (field === "actual_exit_code" && command[field] === null) continue;
      violations.push({ file, line: 0, message: `INVALID_COMMAND_RECORD:${index}:MISSING_${field}` });
    }
  }
}

function validateGeneratedOutputs() {
  const diagnosticDir = ".diagnostics/operational-journey-factory";
  const gapLedgerPath = `${diagnosticDir}/gap-ledger.json`;
  const toolchainPath = `${diagnosticDir}/toolchain-inventory.json`;

  const gapLedger = readJson(gapLedgerPath, null);
  if (gapLedger) {
    for (const [index, gap] of (gapLedger.gaps || []).entries()) {
      for (const field of requiredGapFields) {
        if (!(field in gap) || isEmptyRequiredValue(gap[field])) {
          violations.push({ file: gapLedgerPath, line: 0, message: `INVALID_GAP:${index}:MISSING_${field}` });
        }
      }
      if (gap.owner === "unassigned") {
        violations.push({ file: gapLedgerPath, line: 0, message: `INVALID_GAP:${index}:UNASSIGNED_OWNER` });
      }
    }
  }

  const toolchain = readJson(toolchainPath, null);
  if (toolchain) {
    for (const [toolIndex, tool] of (toolchain.tools || []).entries()) {
      for (const [commandIndex, command] of (tool.commands || []).entries()) {
        validateCommandRecord(command, toolchainPath, `${toolIndex}.${commandIndex}`);
      }
    }
    for (const [scriptIndex, script] of (toolchain.unused_scripts || []).entries()) {
      for (const [commandIndex, command] of (script.commands || []).entries()) {
        validateCommandRecord(command, toolchainPath, `unused.${scriptIndex}.${commandIndex}`);
      }
    }
  }
}

if (!fs.existsSync(factoryDir)) {
  violations.push({ file: "governance/operational_journey_factory", line: 0, message: "MISSING_FACTORY_DIR" });
} else {
  for (const template of requiredTemplates) {
    const file = path.join(factoryDir, template);
    if (!fs.existsSync(file)) {
      violations.push({ file: `governance/operational_journey_factory/${template}`, line: 0, message: "MISSING_TEMPLATE" });
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    if (!/^#\s+/m.test(content)) {
      violations.push({ file: `governance/operational_journey_factory/${template}`, line: 0, message: "MISSING_MARKDOWN_TITLE" });
    }
    const banned = /\b(TODO|TBD)\b|حسب الحاجة|لاحقًا|لاحقا|غير مهم|غير مؤثر/g;
    let match;
    while ((match = banned.exec(content)) !== null) {
      if (!content.slice(Math.max(0, match.index - 80), match.index + 120).includes("justified_exclusion")) {
        violations.push({ file: `governance/operational_journey_factory/${template}`, line: content.slice(0, match.index).split(/\r?\n/).length, message: `BANNED_PLACEHOLDER: ${match[0]}` });
      }
    }
    const statusLine = content.match(/^status:\s*`?([^`\r\n]+)`?/mi);
    if (statusLine && /\b(PASS|CLOSED)\b/.test(statusLine[1])) {
      violations.push({ file: `governance/operational_journey_factory/${template}`, line: 0, message: "STATUS_MUST_NOT_DECLARE_PASS_OR_CLOSED" });
    }
  }
}

for (const rel of requiredScripts) {
  if (!fs.existsSync(path.join(repoRoot, rel))) {
    violations.push({ file: rel, line: 0, message: "MISSING_SCRIPT" });
  }
}

if (!fs.existsSync(path.join(repoRoot, requiredChecklist))) {
  violations.push({ file: requiredChecklist, line: 0, message: "MISSING_CHECKLIST" });
}

if (!fs.existsSync(path.join(factoryDir, "generated", ".gitkeep"))) {
  violations.push({ file: "governance/operational_journey_factory/generated/.gitkeep", line: 0, message: "MISSING_GENERATED_GITKEEP" });
}

const packageJson = readJson("package.json", { scripts: {} });
for (const [name, command] of Object.entries(requiredPackageScripts)) {
  if (packageJson.scripts?.[name] !== command) {
    violations.push({ file: "package.json", line: 0, message: `MISSING_OR_MISMATCHED_PACKAGE_SCRIPT: ${name}` });
  }
}

const guardRegistry = readJson("governance/guards/guard-registry.json", { entries: [] });
if (!(guardRegistry.entries || []).some((entry) => entry.id === "operational-journey-factory" && entry.script === "guard:operational-journey-factory")) {
  violations.push({ file: "governance/guards/guard-registry.json", line: 0, message: "MISSING_GUARD_REGISTRY_ENTRY: operational-journey-factory" });
}

const policy = readFactory("17_GENERATOR_OUTPUT_POLICY.md");
if (!policy.includes(".diagnostics/operational-journey-factory")) {
  violations.push({ file: "governance/operational_journey_factory/17_GENERATOR_OUTPUT_POLICY.md", line: 0, message: "MISSING_OUTPUT_POLICY" });
}

for (const name of fs.existsSync(factoryDir) ? fs.readdirSync(factoryDir) : []) {
  if (/\.(json|raw|log)$/i.test(name)) {
    violations.push({ file: `governance/operational_journey_factory/${name}`, line: 0, message: "RAW_DIAGNOSTIC_TRACKED_IN_GOVERNANCE" });
  }
}

requireText("04_SURFACE_TEMPLATE.md", ["app-client", "app-partner", "app-captain", "app-field", "control-panel", "backend", "database", "runtime", "CI"]);
requireText("06_BACKEND_API_DATABASE_TEMPLATE.md", ["routes", "handlers", "repositories", "migrations", "OpenAPI operationIds", "generated clients"]);
requireText("07_FRONTEND_BINDING_TEMPLATE.md", ["no direct API", "no local business logic", "generated client/API adapter"]);
requireText("08_UI_ICON_COMPONENT_TEMPLATE.md", ["every icon", "every button", "accessibility label"]);
requireText("12_CLEANUP_MOVE_MERGE_DELETE_TEMPLATE.md", ["proof before delete", "proof before move", "proof before merge"]);
requireText("14_JOURNEY_TEMPLATE_MASTER.md", ["gap ledger", "UI item -> shared controller", "Smart Journey Segmentation", "business outcome", "Single-surface journeys are blocked"]);
requireText("16_TEMPLATE_FILLING_RULES.md", ["control-panel/platform", "WLT owns financial truth", "Every `UNKNOWN` must become a required action"]);

const activeToolContent = readFactory("11_TOOLCHAIN_EXECUTION_TEMPLATE.md");
const baseline = readJson("tools/toolchain/tool-activation-baseline.json", { baseline: {} }).baseline || {};
for (const [toolId, activation] of Object.entries(baseline)) {
  if (activation === "active" && !activeToolContent.includes(`\`${toolId}\``)) {
    violations.push({ file: "governance/operational_journey_factory/11_TOOLCHAIN_EXECUTION_TEMPLATE.md", line: 0, message: `ACTIVE_TOOL_NOT_REPRESENTED: ${toolId}` });
  }
}

validateGeneratedOutputs();

fail(guardId, violations);
