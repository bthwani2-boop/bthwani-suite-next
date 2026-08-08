import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "tool-catalog-coverage-gate";
const violations = [];

function readJson(rel) {
  const file = path.join(repoRoot, rel);
  if (!fs.existsSync(file)) {
    violations.push({ file: rel, line: 0, message: "MISSING_FILE" });
    return undefined;
  }
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) {
    violations.push({ file: rel, line: 0, message: `INVALID_JSON: ${error.message}` });
    return undefined;
  }
}

const catalogPath = "tools/toolchain/tool-catalog.v5.json";
const expectedPath = "tools/toolchain/expected-tool-ids.v5.json";
const decisionsPath = "tools/toolchain/tool-decisions.json";
const ownersPath = "tools/toolchain/tool-owners.json";
const activationPath = "tools/toolchain/tool-activation-policy.json";
const catalog = readJson(catalogPath);
const expected = readJson(expectedPath);
const decisions = readJson(decisionsPath);
const owners = readJson(ownersPath);
const activation = readJson(activationPath);
const agentRegistry = readJson("governance/tools/agent-tool-registry.json");
const pkg = readJson("package.json");

const requiredKeys = ["id", "category", "priority", "oss_free", "decision", "activation"];
const allowedActivation = new Set(["active", "partial", "optional", "missing", "disabled"]);
const allowedDecisionActions = new Set(["keep", "add", "remove"]);
const seen = new Set();
const agentToolIds = new Set((agentRegistry?.entries || []).map((entry) => entry.id));
const decisionMap = decisions?.decisions ?? {};
const ownerMap = owners?.owners ?? {};
const activationMap = activation?.activations ?? {};

if (activation?.schemaVersion !== 1 || activation?.policyId !== "TOOL_ACTIVATION_POLICY" || typeof activationMap !== "object") {
  violations.push({ file: activationPath, line: 0, message: "MALFORMED_TOOL_ACTIVATION_POLICY" });
}

if (catalog?.entries) {
  for (const entry of catalog.entries) {
    if (!entry.id) {
      violations.push({ file: catalogPath, line: 0, message: "MALFORMED_ENTRY: missing id" });
      continue;
    }
    if (seen.has(entry.id)) violations.push({ file: catalogPath, line: 0, message: `DUPLICATE_TOOL_ID: ${entry.id}` });
    seen.add(entry.id);
    for (const key of requiredKeys) if (entry[key] === undefined) violations.push({ file: catalogPath, line: 0, message: `MISSING_PROPERTY: ${entry.id}.${key}` });
    if (!allowedActivation.has(entry.activation)) violations.push({ file: catalogPath, line: 0, message: `INVALID_ACTIVATION: ${entry.id}=${entry.activation}` });

    const decision = decisionMap[entry.id];
    if (!decision) violations.push({ file: decisionsPath, line: 0, message: `MISSING_DECISION: ${entry.id}` });
    else {
      if (!allowedDecisionActions.has(decision.action)) violations.push({ file: decisionsPath, line: 0, message: `INVALID_DECISION_ACTION: ${entry.id}=${String(decision.action)}` });
      if (typeof decision.reason !== "string" || decision.reason.trim() === "") violations.push({ file: decisionsPath, line: 0, message: `MISSING_DECISION_REASON: ${entry.id}` });
      if (decision.decision !== undefined) violations.push({ file: decisionsPath, line: 0, message: `LEGACY_DECISION_KEY_FORBIDDEN: ${entry.id}` });
    }

    const owner = ownerMap[entry.id];
    if (!owner) violations.push({ file: ownersPath, line: 0, message: `MISSING_OWNER: ${entry.id}` });
    else {
      if (typeof owner.team !== "string" || !owner.team.trim()) violations.push({ file: ownersPath, line: 0, message: `OWNER_TEAM_MISSING: ${entry.id}` });
      if (typeof owner.scope !== "string" || !owner.scope.trim()) violations.push({ file: ownersPath, line: 0, message: `OWNER_SCOPE_MISSING: ${entry.id}` });
    }

    if (!allowedActivation.has(activationMap[entry.id])) violations.push({ file: activationPath, line: 0, message: `MISSING_OR_INVALID_ACTIVATION: ${entry.id}` });
    else if (activationMap[entry.id] !== entry.activation) violations.push({ file: activationPath, line: 0, message: `ACTIVATION_POLICY_DRIFT: ${entry.id} policy=${activationMap[entry.id]} catalog=${entry.activation}` });
  }
}

for (const [label, map, file] of [["DECISION", decisionMap, decisionsPath], ["OWNER", ownerMap, ownersPath], ["ACTIVATION", activationMap, activationPath]]) {
  for (const id of Object.keys(map)) if (!seen.has(id)) violations.push({ file, line: 0, message: `${label}_TOOL_NOT_IN_CATALOG: ${id}` });
}

if (expected?.expected_tools) {
  const expectedSet = new Set(expected.expected_tools);
  if (expectedSet.size !== expected.expected_tools.length) violations.push({ file: expectedPath, line: 0, message: "DUPLICATE_EXPECTED_TOOL_ID" });
  for (const id of expectedSet) if (!seen.has(id)) violations.push({ file: catalogPath, line: 0, message: `EXPECTED_TOOL_MISSING: ${id}` });
  for (const id of seen) if (!expectedSet.has(id)) violations.push({ file: expectedPath, line: 0, message: `CATALOG_TOOL_NOT_EXPECTED: ${id}` });
}

for (const id of agentToolIds) if (!seen.has(id)) violations.push({ file: catalogPath, line: 0, message: `AGENT_TOOL_MISSING_IN_CATALOG: ${id}` });

if (pkg?.scripts) {
  const knownAgentPrefixes = { graphify: "graphify", leanctx: "leanctx", ocr: "open-code-review" };
  for (const script of Object.keys(pkg.scripts)) {
    for (const [prefix, toolId] of Object.entries(knownAgentPrefixes)) {
      if ((script === prefix || script.startsWith(`${prefix}:`)) && !agentToolIds.has(toolId)) violations.push({ file: "package.json", line: 0, message: `UNREGISTERED_AGENT_TOOL_COMMAND: ${script} refers to ${toolId}` });
    }
  }
}

fail(guardId, violations);
