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
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    violations.push({ file: rel, line: 0, message: `INVALID_JSON: ${error.message}` });
    return undefined;
  }
}

const catalog = readJson("tools/toolchain/tool-catalog.v5.json");
const expected = readJson("tools/toolchain/expected-tool-ids.v5.json");
const decisions = readJson("tools/toolchain/tool-decisions.json");
const owners = readJson("tools/toolchain/tool-owners.json");
const baseline = readJson("tools/toolchain/tool-activation-baseline.json");

const requiredKeys = ["id", "category", "priority", "oss_free", "decision", "activation"];
const allowedActivation = new Set(["active", "partial", "optional", "missing", "disabled"]);
const seen = new Set();

if (catalog?.entries) {
  for (const entry of catalog.entries) {
    if (!entry.id) {
      violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: "MALFORMED_ENTRY: missing id" });
      continue;
    }

    if (seen.has(entry.id)) {
      violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `DUPLICATE_TOOL_ID: ${entry.id}` });
    }
    seen.add(entry.id);

    for (const key of requiredKeys) {
      if (entry[key] === undefined) {
        violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `MISSING_PROPERTY: ${entry.id}.${key}` });
      }
    }

    if (!allowedActivation.has(entry.activation)) {
      violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `INVALID_ACTIVATION: ${entry.id}=${entry.activation}` });
    }

    if (!decisions?.decisions?.[entry.id]) {
      violations.push({ file: "tools/toolchain/tool-decisions.json", line: 0, message: `MISSING_DECISION: ${entry.id}` });
    }

    if (!owners?.owners?.[entry.id]) {
      violations.push({ file: "tools/toolchain/tool-owners.json", line: 0, message: `MISSING_OWNER: ${entry.id}` });
    }

    if (!baseline?.baseline?.[entry.id]) {
      violations.push({ file: "tools/toolchain/tool-activation-baseline.json", line: 0, message: `MISSING_BASELINE: ${entry.id}` });
    }
  }
}

if (expected?.expected_tools) {
  for (const id of expected.expected_tools) {
    if (!seen.has(id)) {
      violations.push({ file: "tools/toolchain/tool-catalog.v5.json", line: 0, message: `EXPECTED_TOOL_MISSING: ${id}` });
    }
  }

  for (const id of seen) {
    if (!expected.expected_tools.includes(id)) {
      violations.push({ file: "tools/toolchain/expected-tool-ids.v5.json", line: 0, message: `CATALOG_TOOL_NOT_EXPECTED: ${id}` });
    }
  }
}

fail(guardId, violations);
