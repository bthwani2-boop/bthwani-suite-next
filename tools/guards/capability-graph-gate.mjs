// Focused guard: validates governance/remediation/capability-graph.json against its
// schema and checks every node references a gap id that actually exists in the
// gap ledger (when gapIds are declared).
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "capability-graph-gate";
const remediationRoot = "governance/remediation";
const violations = [];

function readJson(relative) {
  const full = path.join(repoRoot, relative);
  if (!fs.existsSync(full)) {
    violations.push({ file: relative, line: 0, message: "MISSING_REQUIRED_FILE" });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    violations.push({ file: relative, line: 0, message: `INVALID_JSON ${error.message}` });
    return undefined;
  }
}

const graph = readJson(`${remediationRoot}/capability-graph.json`);
const schema = readJson(`${remediationRoot}/capability-graph.schema.json`);
const ledger = readJson(`${remediationRoot}/gap-ledger.json`);

if (graph && schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(graph)) {
    for (const issue of validate.errors ?? []) violations.push({ file: `${remediationRoot}/capability-graph.json`, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
  }
}

if (graph && ledger) {
  const knownGapIds = new Set((ledger.gaps ?? []).map((gap) => gap.gap_id));
  for (const node of graph.nodes ?? []) {
    for (const gapId of node.gapIds ?? []) {
      if (!knownGapIds.has(gapId)) violations.push({ file: `${remediationRoot}/capability-graph.json`, line: 0, message: `NODE_REFERENCES_UNKNOWN_GAP ${node.nodeId}: ${gapId}` });
    }
  }
}

fail(guardId, violations);
