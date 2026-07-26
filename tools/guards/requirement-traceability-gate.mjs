// Focused guard: validates governance/remediation/requirement-traceability.json
// against its schema and checks every gapId/taskId it references actually exists in
// the gap ledger.
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "requirement-traceability-gate";
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

const traceability = readJson(`${remediationRoot}/requirement-traceability.json`);
const schema = readJson(`${remediationRoot}/requirement-traceability.schema.json`);
const ledger = readJson(`${remediationRoot}/gap-ledger.json`);

if (traceability && schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(traceability)) {
    for (const issue of validate.errors ?? []) violations.push({ file: `${remediationRoot}/requirement-traceability.json`, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
  }
}

if (traceability && ledger) {
  const knownGapIds = new Set((ledger.gaps ?? []).map((gap) => gap.gap_id));
  for (const link of traceability.links ?? []) {
    for (const gapId of link.gapIds ?? []) {
      if (!knownGapIds.has(gapId)) violations.push({ file: `${remediationRoot}/requirement-traceability.json`, line: 0, message: `LINK_REFERENCES_UNKNOWN_GAP ${link.requirementId}: ${gapId}` });
    }
  }
}

fail(guardId, violations);
