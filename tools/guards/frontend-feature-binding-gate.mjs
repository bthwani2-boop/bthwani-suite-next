import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { fail, repoRoot, toPosix } from "./_guard-utils.mjs";
import { cleanupGoRouteExtractor, extractGoRoutes, routeKey } from "./lib/go-route-extractor.mjs";

const guardId = "frontend-feature-binding-gate";
const violations = [];
const registryRelative = "governance/guards/frontend-binding-registry.json";
const schemaRelative = "governance/guards/frontend-binding-registry.schema.json";
const openapiPath = "services/dsh/contracts/dsh.openapi.yaml";
const routerPath = "services/dsh/backend/internal/http/server.go";
const manifestPath = "services/dsh/service.manifest.ts";
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

function resolveRelativeModule(fromRelative, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(repoRoot, path.dirname(fromRelative), specifier);
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
      const resolved = resolveRelativeModule(current, specifier);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return false;
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

const openapi = readText(openapiPath);
const manifest = readText(manifestPath);
let routeSet;
try {
  routeSet = new Set(extractGoRoutes(routerPath).map(routeKey));
} catch (error) {
  violations.push({ file: routerPath, line: 0, message: `GO_AST_ROUTE_EXTRACTION_FAILED ${error.message}` });
}

const seenIds = new Set();
const seenScreens = new Set();
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
    if (seenScreens.has(entry.screen)) violations.push({ file: registryRelative, line: 0, message: `DUPLICATE_SCREEN_BINDING ${entry.screen}` });
    seenIds.add(entry.id);
    seenScreens.add(entry.screen);

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

    const escapedOperationId = entry.operationId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`operationId:\\s*${escapedOperationId}\\b`).test(openapi)) {
      violations.push({ file: openapiPath, line: 0, message: `OPENAPI_OPERATION_MISSING ${entry.id} -> ${entry.operationId}` });
    }
    if (routeSet && !routeSet.has(entry.route)) {
      violations.push({ file: routerPath, line: 0, message: `BACKEND_ROUTE_MISSING ${entry.id} -> ${entry.route}` });
    }
    if (!manifest.includes(entry.capabilityId)) {
      violations.push({ file: manifestPath, line: 0, message: `SERVICE_MANIFEST_CAPABILITY_MISSING ${entry.id} -> ${entry.capabilityId}` });
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
