import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";
import { cleanupGoRouteExtractor, extractGoRoutes, routeKey } from "./lib/go-route-extractor.mjs";

const guardId = "frontend-feature-binding-gate";
const violations = [];
const registryFile = "governance/guards/frontend-binding-registry.json";
const schemaFile = "governance/guards/frontend-binding-registry.schema.json";
const contractRegistryFile = "services/dsh/contracts/contract-registry.ts";
const routerDir = "services/dsh/backend/internal/http";
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function readText(file) {
  const full = path.join(repoRoot, file);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    violations.push({ file, message: `INVALID_OR_MISSING_JSON ${error.message}` });
    return null;
  }
}

function sourceCandidate(base) {
  const candidates = [base];
  for (const extension of sourceExtensions) {
    candidates.push(`${base}${extension}`, path.join(base, `index${extension}`));
  }
  for (const candidate of candidates) {
    if (!candidate.startsWith(`${repoRoot}${path.sep}`)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return toPosix(path.relative(repoRoot, candidate));
    }
  }
  return null;
}

const tsconfig = readJson("tsconfig.base.json");
const aliases = Object.entries(tsconfig?.compilerOptions?.paths ?? {}).flatMap(([pattern, targets]) =>
  (Array.isArray(targets) ? targets : []).map((target) => ({ pattern, target })),
);

function resolveModule(fromFile, specifier) {
  if (specifier.startsWith(".")) {
    return sourceCandidate(path.resolve(repoRoot, path.dirname(fromFile), specifier));
  }
  for (const alias of aliases) {
    const star = alias.pattern.indexOf("*");
    if (star < 0) {
      if (specifier === alias.pattern) return sourceCandidate(path.resolve(repoRoot, alias.target));
      continue;
    }
    const prefix = alias.pattern.slice(0, star);
    const suffix = alias.pattern.slice(star + 1);
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
    const value = specifier.slice(prefix.length, specifier.length - suffix.length);
    return sourceCandidate(path.resolve(repoRoot, alias.target.replace("*", value)));
  }
  return null;
}

function importsOf(file) {
  const source = readText(file);
  const values = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push(match[1]);
  }
  return values;
}

function reaches(start, target) {
  const queue = [toPosix(start)];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === toPosix(target)) return true;
    visited.add(current);
    for (const specifier of importsOf(current)) {
      const resolved = resolveModule(current, specifier);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return false;
}

function operationIds() {
  const files = new Set(["services/dsh/contracts/dsh.openapi.yaml"]);
  const source = readText(contractRegistryFile);
  const matcher = /path:\s*["'](contracts\/[^"']+\.openapi\.yaml)["']/g;
  for (const match of source.matchAll(matcher)) files.add(`services/dsh/${match[1]}`);
  const ids = new Set();
  for (const file of files) {
    if (!readText(file)) {
      violations.push({ file: contractRegistryFile, message: `REGISTERED_CONTRACT_MISSING ${file}` });
      continue;
    }
    for (const operation of parseOpenApiContract(file)) {
      if (operation.operationId) ids.add(operation.operationId);
    }
  }
  return ids;
}

function routeSet() {
  const routes = new Set();
  for (const name of fs.readdirSync(path.join(repoRoot, routerDir))) {
    if (!name.endsWith(".go") || name.endsWith("_test.go")) continue;
    for (const route of extractGoRoutes(`${routerDir}/${name}`)) routes.add(routeKey(route));
  }
  return routes;
}

function capabilityIds() {
  const ids = new Set();
  for (const file of ["services/dsh/capability-map.ts", "services/dsh/capability-map.extensions.ts"]) {
    for (const match of readText(file).matchAll(/\bid:\s*["']([^"']+)["']/g)) ids.add(match[1]);
  }
  return ids;
}

const registry = readJson(registryFile);
const schema = readJson(schemaFile);
if (registry && schema) {
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  if (!validate(registry)) {
    for (const error of validate.errors ?? []) {
      violations.push({ file: registryFile, message: `SCHEMA_VIOLATION ${error.instancePath} ${error.message}` });
    }
  }
}

const operations = operationIds();
const capabilities = capabilityIds();
let routes = new Set();
try {
  routes = routeSet();
} catch (error) {
  violations.push({ file: routerDir, message: `GO_AST_ROUTE_EXTRACTION_FAILED ${error.message}` });
}

const prefixes = {
  "app-client": "services/dsh/frontend/app-client/",
  "app-partner": "services/dsh/frontend/app-partner/",
  "app-captain": "services/dsh/frontend/app-captain/",
  "app-field": "services/dsh/frontend/app-field/",
  "control-panel": "services/dsh/frontend/control-panel/",
};
const ids = new Set();
const bindings = new Set();

try {
  for (const entry of registry?.entries ?? []) {
    if (ids.has(entry.id)) violations.push({ file: registryFile, message: `DUPLICATE_BINDING_ID ${entry.id}` });
    ids.add(entry.id);
    const key = `${entry.screen}|${entry.controller}|${entry.operationId}|${entry.route}`;
    if (bindings.has(key)) violations.push({ file: registryFile, message: `DUPLICATE_FRONTEND_BINDING ${entry.id}` });
    bindings.add(key);

    if (!entry.screen.startsWith(prefixes[entry.surface] ?? "<invalid>/")) {
      violations.push({ file: registryFile, message: `SURFACE_SCREEN_PATH_MISMATCH ${entry.id}` });
    }
    if (!readText(entry.screen)) violations.push({ file: entry.screen, message: `SCREEN_MISSING ${entry.id}` });
    if (!readText(entry.controller)) violations.push({ file: entry.controller, message: `CONTROLLER_MISSING ${entry.id}` });
    if (readText(entry.screen) && readText(entry.controller) && !reaches(entry.screen, entry.controller)) {
      violations.push({ file: entry.screen, message: `SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE ${entry.id} -> ${entry.controller}` });
    }
    if (!operations.has(entry.operationId)) violations.push({ file: contractRegistryFile, message: `OPENAPI_OPERATION_MISSING ${entry.id} -> ${entry.operationId}` });
    if (!routes.has(entry.route)) violations.push({ file: routerDir, message: `BACKEND_ROUTE_MISSING ${entry.id} -> ${entry.route}` });
    if (!capabilities.has(entry.capabilityId)) violations.push({ file: "services/dsh/capability-map.ts", message: `SERVICE_MANIFEST_CAPABILITY_MISSING ${entry.id} -> ${entry.capabilityId}` });
  }
} finally {
  cleanupGoRouteExtractor();
}

if ((registry?.entries ?? []).length === 0) violations.push({ file: registryFile, message: "EMPTY_FRONTEND_BINDING_REGISTRY" });
console.log(`frontend-feature-binding-gate: checked ${(registry?.entries ?? []).length} STATIC_BINDING entries`);
console.log("frontend-feature-binding-gate: proves static dependency and contract reachability only; runtime requires same-commit runtime evidence");
fail(guardId, violations);
