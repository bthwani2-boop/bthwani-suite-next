import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";
import { parseOpenApiContract } from "./_openapi-utils.mjs";
import { cleanupGoRouteExtractor, extractGoRoutes, routeKey } from "./lib/go-route-extractor.mjs";

const guardId = "frontend-feature-binding-gate";
const violations = [];
const registryRelative = "governance/guards/frontend-binding-registry.json";
const schemaRelative = "governance/guards/frontend-binding-registry.schema.json";
const openapiPath = "services/dsh/contracts/dsh.openapi.yaml";
const routerDir = "services/dsh/backend/internal/http";
const capabilityFiles = [
  "services/dsh/capability-map.ts",
  "services/dsh/capability-map.extensions.ts",
];
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
  } catch (error) {
    violations.push({ file: relativePath, line: 0, message: `INVALID_OR_MISSING_JSON ${error.message}` });
    return null;
  }
}

function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf8");
}

function moduleSpecifiers(content) {
  const specifiers = [];
  const staticPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const pattern of [staticPattern, dynamicPattern]) {
    for (const match of content.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveSourceCandidate(base) {
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => path.join(base, `index${extension}`)),
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(`${repoRoot}${path.sep}`)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return toPosix(path.relative(repoRoot, candidate));
    }
  }
  return null;
}

function loadAliases() {
  const config = readJson("tsconfig.base.json");
  const aliases = [];
  for (const [pattern, targets] of Object.entries(config?.compilerOptions?.paths ?? {})) {
    for (const target of Array.isArray(targets) ? targets : []) aliases.push({ pattern, target });
  }
  return aliases;
}

const aliases = loadAliases();

function resolveModule(fromRelative, specifier) {
  if (specifier.startsWith(".")) {
    return resolveSourceCandidate(path.resolve(repoRoot, path.dirname(fromRelative), specifier));
  }

  for (const alias of aliases) {
    const wildcardIndex = alias.pattern.indexOf("*");
    if (wildcardIndex === -1) {
      if (specifier !== alias.pattern) continue;
      return resolveSourceCandidate(path.resolve(repoRoot, alias.target));
    }

    const prefix = alias.pattern.slice(0, wildcardIndex);
    const suffix = alias.pattern.slice(wildcardIndex + 1);
    if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
    const wildcard = specifier.slice(prefix.length, specifier.length - suffix.length);
    const target = alias.target.replace("*", wildcard);
    return resolveSourceCandidate(path.resolve(repoRoot, target));
  }

  return null;
}

function hasDependencyPath(startRelative, targetRelative) {
  const target = toPosix(targetRelative);
  const queue = [toPosix(startRelative)];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (current === target) return true;
    visited.add(current);

    const content = readText(current);
    for (const specifier of moduleSpecifiers(content)) {
      const resolved = resolveModule(current, specifier);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return false;
}

function collectRouteSet() {
  const set = new Set();
  const absoluteDir = path.join(repoRoot, routerDir);
  for (const entry of fs.readdirSync(absoluteDir)) {
    if (!entry.endsWith(".go") || entry.endsWith("_test.go")) continue;
    const relative = `${routerDir}/${entry}`;
    for (const route of extractGoRoutes(relative)) set.add(routeKey(route));
  }
  return set;
}

function collectCapabilityIds() {
  const ids = new Set();
  for (const file of capabilityFiles) {
    const source = readText(file);
    for (const match of source.matchAll(/\bid:\s*["']([^"']+)["']/g)) ids.add(match[1]);
  }
  return ids;
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

const operationIds = new Set(
  parseOpenApiContract(openapiPath).map((operation) => operation.operationId).filter(Boolean),
);
const capabilityIds = collectCapabilityIds();
let routeSet;
try {
  routeSet = collectRouteSet();
} catch (error) {
  violations.push({ file: routerDir, line: 0, message: `GO_AST_ROUTE_EXTRACTION_FAILED ${error.message}` });
}

const seenIds = new Set();
const seenBindings = new Set();
const expectedPrefix = {
  "app-client": "services/dsh/frontend/app-client/",
  "app-partner": "services/dsh/frontend/app-partner/",
  "app-captain": "services/dsh/frontend/app-captain/",
  "app-field": "services/dsh/frontend/app-field/",
  "control-panel": "services/dsh/frontend/control-panel/",
};

try {
  for (const entry of registry?.entries ?? []) {
    if (seenIds.has(entry.id)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_BINDING_ID ${entry.id}` });
    seenIds.add(entry.id);

    const bindingKey = `${entry.screen}|${entry.controller}|${entry.operationId}|${entry.route}`;
    if (seenBindings.has(bindingKey)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_FRONTEND_BINDING ${entry.id}` });
    seenBindings.add(bindingKey);

    if (!entry.screen.startsWith(expectedPrefix[entry.surface] ?? "<invalid>/")) {
      violations.push({ file: registryRelative, line: 0, message: `SURFACE_SCREEN_PATH_MISMATCH ${entry.id}` });
    }

    const screenExists = fs.existsSync(path.join(repoRoot, entry.screen));
    const controllerExists = fs.existsSync(path.join(repoRoot, entry.controller));
    if (!screenExists) violations.push({ file: entry.screen, line: 0, message: `SCREEN_MISSING ${entry.id}` });
    if (!controllerExists) violations.push({ file: entry.controller, line: 0, message: `CONTROLLER_MISSING ${entry.id}` });
    if (screenExists && controllerExists && !hasDependencyPath(entry.screen, entry.controller)) {
      violations.push({ file: entry.screen, line: 0, message: `SCREEN_CONTROLLER_DEPENDENCY_UNREACHABLE ${entry.id} -> ${entry.controller}` });
    }

    if (!operationIds.has(entry.operationId)) {
      violations.push({ file: openapiPath, line: 0, message: `OPENAPI_OPERATION_MISSING ${entry.id} -> ${entry.operationId}` });
    }
    if (routeSet && !routeSet.has(entry.route)) {
      violations.push({ file: routerDir, line: 0, message: `BACKEND_ROUTE_MISSING ${entry.id} -> ${entry.route}` });
    }
    if (!capabilityIds.has(entry.capabilityId)) {
      violations.push({ file: capabilityFiles.join(","), line: 0, message: `SERVICE_MANIFEST_CAPABILITY_MISSING ${entry.id} -> ${entry.capabilityId}` });
    }
  }
} finally {
  cleanupGoRouteExtractor();
}

if ((registry?.entries ?? []).length === 0) {
  violations.push({ file: registryRelative, line: 0, message: "EMPTY_FRONTEND_BINDING_REGISTRY" });
}

console.log(`frontend-feature-binding-gate: checked ${(registry?.entries ?? []).length} STATIC_BINDING entries`);
console.log("frontend-feature-binding-gate: proves static dependency and contract reachability only; runtime requires same-commit runtime evidence");
fail(guardId, violations);
