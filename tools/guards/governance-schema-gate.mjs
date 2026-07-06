/**
 * tools/guards/governance-schema-gate.mjs
 *
 * BTHWANI_GOVERNANCE_AS_CODE_GATE — JSON Schema Registry Validator
 *
 * Validates governance registry files against their JSON schemas using Ajv.
 *
 * Registries validated:
 *   - governance/agents/agent-registry.json
 *   - governance/skills/skills-registry.json
 *   - governance/guards/guard-registry.json
 *
 * FAIL: schema violations, missing registry files, or invalid JSON structures.
 */

import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "governance-schema-gate";
const violations = [];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const REGISTRIES = [
  {
    name: "Agent Registry",
    registry: "governance/agents/agent-registry.json",
    schema: "governance/agents/agent-schema.json",
  },
  {
    name: "Skills Registry",
    registry: "governance/skills/skills-registry.json",
    schema: "governance/skills/skills-schema.json",
  },
  {
    name: "Guard Registry",
    registry: "governance/guards/guard-registry.json",
    schema: "governance/guards/guard-schema.json",
  },
];

for (const { name, registry, schema } of REGISTRIES) {
  const regPath = path.join(repoRoot, registry);
  const schPath = path.join(repoRoot, schema);

  if (!fs.existsSync(regPath)) {
    violations.push({
      file: registry,
      line: 0,
      message: `MISSING_REGISTRY: ${name} file not found at '${registry}'`,
    });
    continue;
  }

  if (!fs.existsSync(schPath)) {
    violations.push({
      file: schema,
      line: 0,
      message: `MISSING_SCHEMA: JSON Schema not found at '${schema}'`,
    });
    continue;
  }

  let data, schemaJson;
  try {
    data = JSON.parse(fs.readFileSync(regPath, "utf8"));
  } catch (e) {
    violations.push({
      file: registry,
      line: 0,
      message: `INVALID_JSON: Failed to parse JSON — ${e.message}`,
    });
    continue;
  }

  try {
    schemaJson = JSON.parse(fs.readFileSync(schPath, "utf8"));
  } catch (e) {
    violations.push({
      file: schema,
      line: 0,
      message: `INVALID_SCHEMA_JSON: Failed to parse schema JSON — ${e.message}`,
    });
    continue;
  }

  const validate = ajv.compile(schemaJson);
  const valid = validate(data);

  if (!valid) {
    for (const err of validate.errors) {
      violations.push({
        file: registry,
        line: 0,
        message: `SCHEMA_VIOLATION: Path '${err.instancePath}' ${err.message} (params: ${JSON.stringify(err.params)})`,
      });
    }
  }
}

fail(guardId, violations);
