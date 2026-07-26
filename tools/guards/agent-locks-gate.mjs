// Validates governance/remediation/agent-locks.json against its schema and scans
// any live locks under .diagnostics/remediation/locks/ (untracked runtime state) for
// conflicting non-expired holders on the same resource.
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";
import { detectLockConflicts } from "../remediation/agents/detect-lock-conflicts.mjs";

const guardId = "agent-locks-gate";
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

const locksDeclaration = readJson(`${remediationRoot}/agent-locks.json`);
const schema = readJson(`${remediationRoot}/agent-locks.schema.json`);

if (locksDeclaration && schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(locksDeclaration)) {
    for (const issue of validate.errors ?? []) violations.push({ file: `${remediationRoot}/agent-locks.json`, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
  }
}

const liveLockRoot = path.join(repoRoot, ".diagnostics", "remediation", "locks");
if (fs.existsSync(liveLockRoot)) {
  const locks = fs
    .readdirSync(liveLockRoot)
    .filter((name) => name.endsWith(".lock.json"))
    .map((name) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(liveLockRoot, name), "utf8"));
      } catch (error) {
        violations.push({ file: `.diagnostics/remediation/locks/${name}`, line: 0, message: `INVALID_JSON ${error.message}` });
        return undefined;
      }
    })
    .filter(Boolean);
  for (const conflict of detectLockConflicts(locks)) {
    violations.push({ file: ".diagnostics/remediation/locks", line: 0, message: `LOCK_CONFLICT ${conflict.resource}: ${conflict.taskIds.join(", ")}` });
  }
}

fail(guardId, violations);
