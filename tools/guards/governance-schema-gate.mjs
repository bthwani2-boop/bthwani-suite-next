/**
 * BTHWANI_GOVERNANCE_AS_CODE_GATE
 *
 * Validates every machine-readable governance registry against its owning JSON
 * schema. Semantic cross-file checks remain in the dedicated owner guards.
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
    name: "Authority Precedence Registry",
    registry: "governance/authority/authority-precedence.json",
    schema: "governance/authority/authority-precedence.schema.json",
  },
  {
    name: "Decision Vocabulary",
    registry: "governance/contracts/decision-vocabulary.json",
    schema: "governance/contracts/decision-vocabulary.schema.json",
  },
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
  {
    name: "Product Truth Template",
    registry: "governance/product/contracts/TEMPLATE.product-truth.json",
    schema: "governance/product/product-truth.schema.json",
  },
];

for (const { name, registry, schema } of REGISTRIES) {
  const registryPath = path.join(repoRoot, registry);
  const schemaPath = path.join(repoRoot, schema);

  if (!fs.existsSync(registryPath)) {
    violations.push({ file: registry, line: 0, message: `MISSING_REGISTRY ${name}` });
    continue;
  }
  if (!fs.existsSync(schemaPath)) {
    violations.push({ file: schema, line: 0, message: `MISSING_SCHEMA ${name}` });
    continue;
  }

  let data;
  let schemaJson;
  try {
    data = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (error) {
    violations.push({ file: registry, line: 0, message: `INVALID_JSON ${error.message}` });
    continue;
  }
  try {
    schemaJson = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    violations.push({ file: schema, line: 0, message: `INVALID_SCHEMA_JSON ${error.message}` });
    continue;
  }

  let validate;
  try {
    validate = ajv.compile(schemaJson);
  } catch (error) {
    violations.push({ file: schema, line: 0, message: `SCHEMA_COMPILE_FAILURE ${error.message}` });
    continue;
  }

  if (!validate(data)) {
    for (const error of validate.errors ?? []) {
      violations.push({
        file: registry,
        line: 0,
        message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message} ${JSON.stringify(error.params)}`,
      });
    }
  }
}

fail(guardId, violations);
