// Focused guard: validates governance/remediation/gap-ledger.json against its schema
// and the semantic ledger rules (known state, known type, registered verification
// profile, blocked-reason presence). Reuses the exported validateLedger from
// remediation-governance-gate.mjs so the rule lives in exactly one place.
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";
import { validateLedger } from "./remediation-governance-gate.mjs";

const guardId = "gap-ledger-gate";
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

const ledger = readJson(`${remediationRoot}/gap-ledger.json`);
const ledgerSchema = readJson(`${remediationRoot}/gap-ledger.schema.json`);
const machine = readJson(`${remediationRoot}/task-state-machine.json`);
const profiles = readJson(`${remediationRoot}/verification-profiles.json`);

if (ledger && ledgerSchema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(ledgerSchema);
  if (!validate(ledger)) {
    for (const issue of validate.errors ?? []) violations.push({ file: `${remediationRoot}/gap-ledger.json`, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
  }
}

if (ledger && machine && profiles) {
  for (const message of validateLedger(ledger, machine, profiles)) {
    violations.push({ file: `${remediationRoot}/gap-ledger.json`, line: 0, message });
  }
}

fail(guardId, violations);
