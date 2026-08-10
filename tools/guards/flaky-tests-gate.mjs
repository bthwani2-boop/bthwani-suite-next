// Validates governance/guards/flaky-tests.json against its schema and enforces
// the spec S17 rules: FLAKY_CONFIRMED entries required for proof block closure,
// and any QUARANTINED entry past its quarantineExpiry becomes EXPIRED_QUARANTINE
// (which itself blocks closure) rather than silently staying quarantined forever.
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "flaky-tests-gate";
const qualityRoot = "governance/guards";
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

const registry = readJson(`${qualityRoot}/flaky-tests.json`);
const schema = readJson(`${qualityRoot}/flaky-tests.schema.json`);

if (registry && schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(registry)) {
    for (const issue of validate.errors ?? []) violations.push({ file: `${qualityRoot}/flaky-tests.json`, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
  }
}

if (registry) {
  const today = new Date().toISOString().slice(0, 10);
  for (const entry of registry.entries ?? []) {
    if (entry.state === "QUARANTINED" && entry.quarantineExpiry && entry.quarantineExpiry < today) {
      violations.push({ file: `${qualityRoot}/flaky-tests.json`, line: 0, message: `QUARANTINE_EXPIRED_WITHOUT_FIX ${entry.testId} (expired ${entry.quarantineExpiry})` });
    }
    if (entry.state === "QUARANTINED" && !entry.quarantineExpiry) {
      violations.push({ file: `${qualityRoot}/flaky-tests.json`, line: 0, message: `QUARANTINE_WITHOUT_EXPIRY ${entry.testId}` });
    }
  }
}

fail(guardId, violations);
