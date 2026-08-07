import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-traceability";
const schemaFile = "governance/contracts/sdlc/artifact-manifest.schema.json";
const violations = [];
if (!fs.existsSync(path.join(repoRoot, schemaFile))) violations.push({ file: schemaFile, message: "MISSING_ARTIFACT_SCHEMA" });
else {
  const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, schemaFile), "utf8"));
  const required = new Set(schema.required ?? []);
  for (const field of ["capabilityId", "resolvedCommitSha", "currentStage", "requestedStage", "applicableGates", "evidence", "decision"])
    if (!required.has(field)) violations.push({ file: schemaFile, message: `MISSING_TRACEABILITY_REQUIRED_FIELD: ${field}` });
}
fail(guardId, violations);
