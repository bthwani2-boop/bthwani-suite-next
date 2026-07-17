import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot } from "./_guard-utils.mjs";

const guardId = "frontend-feature-binding-gate";
const violations = [];
const registryRelative = "governance/guards/frontend-binding-registry.json";
const schemaRelative = "governance/guards/frontend-binding-registry.schema.json";

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_OR_MISSING_JSON ${error.message}` });
    return null;
  }
}

const registry = readJson(registryRelative);
const schema = readJson(schemaRelative);
if (registry && schema) {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  if (!validate(registry)) {
    for (const error of validate.errors ?? []) {
      violations.push({ file: registryRelative, line: 0, message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}` });
    }
  }
}

const openapiPath = "services/dsh/contracts/dsh.openapi.yaml";
const routerPath = "services/dsh/backend/internal/http/server.go";
const manifestPath = "services/dsh/service.manifest.ts";
const openapi = fs.readFileSync(path.join(repoRoot, openapiPath), "utf8");
const router = fs.readFileSync(path.join(repoRoot, routerPath), "utf8");
const manifest = fs.readFileSync(path.join(repoRoot, manifestPath), "utf8");

const seenIds = new Set();
const seenScreens = new Set();
const expectedPrefix = {
  "app-client": "services/dsh/frontend/app-client/",
  "app-partner": "services/dsh/frontend/app-partner/",
  "app-captain": "services/dsh/frontend/app-captain/",
  "app-field": "services/dsh/frontend/app-field/",
  "control-panel": "services/dsh/frontend/control-panel/",
};

for (const entry of registry?.entries ?? []) {
  if (seenIds.has(entry.id)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_BINDING_ID ${entry.id}` });
  if (seenScreens.has(entry.screen)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_SCREEN_BINDING ${entry.screen}` });
  seenIds.add(entry.id);
  seenScreens.add(entry.screen);

  if (!entry.screen.startsWith(expectedPrefix[entry.surface] ?? "<invalid>/")) {
    violations.push({ file: registryRelative, line: 0, message: `SURFACE_SCREEN_PATH_MISMATCH ${entry.id}` });
  }

  if (!fs.existsSync(path.join(repoRoot, entry.screen))) {
    violations.push({ file: entry.screen, line: 0, message: `SCREEN_MISSING ${entry.id}` });
  }
  if (!fs.existsSync(path.join(repoRoot, entry.controller))) {
    violations.push({ file: entry.controller, line: 0, message: `CONTROLLER_MISSING ${entry.id}` });
  }

  const operationPattern = new RegExp(`operationId:\\s*${entry.operationId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  if (!operationPattern.test(openapi)) {
    violations.push({ file: openapiPath, line: 0, message: `OPENAPI_OPERATION_MISSING ${entry.id} -> ${entry.operationId}` });
  }
  if (!router.includes(entry.route)) {
    violations.push({ file: routerPath, line: 0, message: `BACKEND_ROUTE_MISSING ${entry.id} -> ${entry.route}` });
  }
  if (!manifest.includes(entry.capabilityId)) {
    violations.push({ file: manifestPath, line: 0, message: `SERVICE_MANIFEST_CAPABILITY_MISSING ${entry.id} -> ${entry.capabilityId}` });
  }
}

if ((registry?.entries ?? []).length === 0) {
  violations.push({ file: registryRelative, line: 0, message: "EMPTY_FRONTEND_BINDING_REGISTRY" });
}

console.log(`frontend-feature-binding-gate: checked ${(registry?.entries ?? []).length} STATIC_BINDING entries`);
console.log("frontend-feature-binding-gate: runtime verification is intentionally out of scope and requires same-commit runtime evidence");
fail(guardId, violations);
