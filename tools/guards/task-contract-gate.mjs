// Focused guard: validates every task contract instance under
// governance/remediation/tasks/** against task-contract.schema.json and the
// semantic rules (executor/approver separation, scope-vs-budget, WU write paths).
// A thin, fast wrapper reusing the exported validators from
// remediation-governance-gate.mjs so the rules live in exactly one place.
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";
import { validateTaskContract } from "./remediation-governance-gate.mjs";

const guardId = "task-contract-gate";
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

const workUnitSchema = readJson(`${remediationRoot}/work-unit.schema.json`);
const taskContractSchema = readJson(`${remediationRoot}/task-contract.schema.json`);
const policy = readJson(`${remediationRoot}/progressive-remediation-policy.json`);

if (workUnitSchema && taskContractSchema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(workUnitSchema, "work-unit.schema.json");
  const validate = ajv.compile(taskContractSchema);

  const tasksRoot = path.join(repoRoot, remediationRoot, "tasks");
  if (fs.existsSync(tasksRoot)) {
    for (const bucket of ["active", "blocked", "completed", "archived"]) {
      const bucketPath = path.join(tasksRoot, bucket);
      if (!fs.existsSync(bucketPath)) continue;
      for (const entry of fs.readdirSync(bucketPath).filter((name) => name.endsWith(".json"))) {
        const relative = `${remediationRoot}/tasks/${bucket}/${entry}`;
        const contract = readJson(relative);
        if (!contract) continue;
        if (!validate(contract)) {
          for (const issue of validate.errors ?? []) violations.push({ file: relative, line: 0, message: `SCHEMA_VIOLATION ${issue.instancePath || "/"} ${issue.message}` });
        }
        for (const message of validateTaskContract(contract, policy)) violations.push({ file: relative, line: 0, message });
      }
    }
  }
}

fail(guardId, violations);
