import fs from "node:fs";
import path from "node:path";
import { fail, repoRoot } from "../_guard-utils.mjs";

const guardId = "sdlc-traceability";
const schemaFile = "governance/operational_journey_protocol_package/sdlc/artifact-manifest.schema.json";
const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, schemaFile), "utf8"));
const required = new Set(schema.required ?? []);
const expected = ["capabilityId", "resolvedCommitSha", "currentStage", "requestedStage", "applicableGates", "evidence", "decision"];
const violations = expected
  .filter((field) => !required.has(field))
  .map((field) => ({ file: schemaFile, message: `MISSING_TRACEABILITY_REQUIRED_FIELD: ${field}` }));

fail(guardId, violations);
