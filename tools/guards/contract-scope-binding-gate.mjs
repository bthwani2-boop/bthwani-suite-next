#!/usr/bin/env node
// Derives the authorization inventory from Go enforcement sites and verifies
// that bounded-context contracts bind only to permissions that are actually enforced.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { extractGoRoutes } from "./lib/go-route-extractor.mjs";
import { findMatchingDelimiter } from "./lib/go-scanner.mjs";
import {
  collectEnforcedAuthorizationScopes,
  relativeGoFiles,
  resolveDshPermissionExpression,
} from "./lib/authorization-scope-extractor.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const retiredVocabularyRelative = "tools/verification/security-scope-vocabulary.json";
const failures = [];

if (fs.existsSync(path.join(repositoryRoot, retiredVocabularyRelative))) {
  failures.push(`${retiredVocabularyRelative}: retired shadow authorization inventory must not exist`);
}

const extraction = collectEnforcedAuthorizationScopes(repositoryRoot);
for (const failure of extraction.failures) failures.push(failure);
const { enforced, dshConstants, dynamicFunctions } = extraction;

for (const scope of enforced) {
  if (!/^[a-z][a-z0-9_.:-]*$/.test(scope) || scope.includes("*") || /(?:^|[.:])-/.test(scope)) {
    failures.push(`Go enforces non-canonical authorization token '${scope}'`);
  }
}

const capabilityContractRelative = "services/dsh/contracts/authorization-capabilities.json";
const capabilityContract = JSON.parse(fs.readFileSync(path.join(repositoryRoot, capabilityContractRelative), "utf8"));
if (capabilityContract.authority !== "DSH_CONTROL_PANEL_AUTHORIZATION_CAPABILITIES") {
  failures.push(`${capabilityContractRelative}: unexpected authority '${capabilityContract.authority ?? "missing"}'`);
}
if (capabilityContract.owner !== "services/dsh") {
  failures.push(`${capabilityContractRelative}: owner must be services/dsh`);
}
for (const capability of capabilityContract.capabilities ?? []) {
  for (const action of ["read", "manage", "healthRead", "auditRead", "rollback"]) {
    for (const permission of capability[action] ?? []) {
      if (!enforced.has(permission)) {
        failures.push(`${capabilityContractRelative}: ${capability.id}.${action} declares '${permission}' but no Go enforcement site derives it`);
      }
    }
  }
}

const dshRoutes = extractGoRoutes("services/dsh/backend/internal/http/server.go");
for (const route of dshRoutes) {
  if (route.handler.kind !== "withPermission") continue;
  const relative = path.relative(repositoryRoot, route.filePath).replaceAll("\\", "/");
  const resolved = resolveDshPermissionExpression(route.handler.permissionExpression, dshConstants, dynamicFunctions);
  if (resolved.size === 0) {
    failures.push(`${relative}:${route.line} ${route.route}: unresolved permission expression '${route.handler.permissionExpression}'`);
  }
  for (const permission of resolved) enforced.add(permission);
}

const eligibilityContractRelative = "services/dsh/contracts/dsh.captain-financial-eligibility.openapi.yaml";
const eligibilityContract = YAML.parse(fs.readFileSync(path.join(repositoryRoot, eligibilityContractRelative), "utf8"));
const eligibilityOperations = new Map();
for (const [routePath, pathItem] of Object.entries(eligibilityContract.paths ?? {})) {
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    const operation = pathItem?.[method];
    if (!operation?.operationId) continue;
    eligibilityOperations.set(operation.operationId, {
      method: method.toUpperCase(),
      path: routePath,
      operation,
    });
  }
}

const permissionBoundOperationIds = new Set([
  "getOperatorCaptainFinancialEligibility",
  "refreshOperatorCaptainFinancialEligibility",
]);
const actorBoundOperationIds = new Set([
  "getOwnCaptainFinancialEligibility",
  "refreshOwnCaptainFinancialEligibility",
]);

const routeBindings = new Map();
for (const route of dshRoutes) {
  const relative = path.relative(repositoryRoot, route.filePath).replaceAll("\\", "/");
  let permission;
  if (route.handler.kind === "withPermission") {
    const resolved = resolveDshPermissionExpression(route.handler.permissionExpression, dshConstants, dynamicFunctions);
    if (resolved.size === 1) permission = [...resolved][0];
  }
  routeBindings.set(route.route, {
    handler: route.handler.handlerName,
    file: relative,
    permission,
  });
}

function findHandlerSource(handlerName) {
  if (!handlerName) return null;
  const signature = `func (s *protectedStoreServer) ${handlerName}(`;
  for (const { absolute, relative } of relativeGoFiles(repositoryRoot, "services/dsh/backend/internal/http")) {
    const source = fs.readFileSync(absolute, "utf8");
    const signatureIndex = source.indexOf(signature);
    if (signatureIndex < 0) continue;
    const bodyStart = source.indexOf("{", signatureIndex + signature.length);
    if (bodyStart < 0) continue;
    const bodyEnd = findMatchingDelimiter(source, bodyStart, "{", "}");
    if (bodyEnd < 0) continue;
    return { file: relative, text: source.slice(bodyStart + 1, bodyEnd) };
  }
  return null;
}

const declaredEligibilityErrorCodes = new Set();
for (const [operationId, binding] of eligibilityOperations) {
  const permissions = binding.operation["x-bthwani-required-permissions"];
  const actorTypes = binding.operation["x-bthwani-actor-types"];
  const errorCodes = binding.operation["x-bthwani-error-codes"];
  if (!Array.isArray(errorCodes) || errorCodes.length === 0) {
    failures.push(`${eligibilityContractRelative}: ${operationId} must declare non-empty x-bthwani-error-codes`);
  } else {
    for (const code of errorCodes) {
      if (typeof code !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(code)) {
        failures.push(`${eligibilityContractRelative}: ${operationId} declares invalid error code '${code}'`);
      } else {
        declaredEligibilityErrorCodes.add(code);
      }
    }
  }

  const route = routeBindings.get(`${binding.method} ${binding.path}`);
  if (!route) {
    failures.push(`${eligibilityContractRelative}: ${operationId} has no matching registered Go route`);
    continue;
  }
  const handler = findHandlerSource(route.handler);
  if (!handler) {
    failures.push(`${route.file}: registered handler '${route.handler ?? "unresolved"}' for ${operationId} was not found`);
    continue;
  }

  if (permissionBoundOperationIds.has(operationId)) {
    if (!Array.isArray(permissions) || permissions.length !== 1) {
      failures.push(`${eligibilityContractRelative}: ${operationId} must declare exactly one required permission`);
      continue;
    }
    if (!enforced.has(permissions[0])) {
      failures.push(`${eligibilityContractRelative}: ${operationId} declares '${permissions[0]}' with no derived Go enforcement site`);
    }
    let enforcedPermission = route.permission;
    if (!enforcedPermission) {
      const permissionMatch = handler.text.match(/requirePermission\(w,\s*r,\s*"[^"]+",\s*([A-Za-z][A-Za-z0-9]*)\)/);
      enforcedPermission = permissionMatch ? dshConstants.get(permissionMatch[1]) : undefined;
    }
    if (!enforcedPermission || enforcedPermission !== permissions[0]) {
      failures.push(`${handler.file}: ${route.handler} enforces '${enforcedPermission ?? "unresolved"}' but ${operationId} declares '${permissions[0]}'`);
    }
  }

  if (actorBoundOperationIds.has(operationId)) {
    if (!Array.isArray(actorTypes) || actorTypes.length !== 1 || actorTypes[0] !== "captain") {
      failures.push(`${eligibilityContractRelative}: ${operationId} must declare x-bthwani-actor-types: [captain]`);
    }
    if (!/requireActor\(w,\s*r,\s*"captain"\)/.test(handler.text)) {
      failures.push(`${handler.file}: ${route.handler} does not enforce the declared captain actor type`);
    }
  }
}

const eligibilityHandlerSource = fs.readFileSync(
  path.join(repositoryRoot, "services/dsh/backend/internal/http/captain_financial_eligibility.go"),
  "utf8",
);
for (const match of eligibilityHandlerSource.matchAll(/store\.SendError\([^,]+,\s*[^,]+,\s*"([A-Za-z0-9_]+)"/g)) {
  if (!declaredEligibilityErrorCodes.has(match[1])) {
    failures.push(`${eligibilityContractRelative}: emitted eligibility error '${match[1]}' is absent from x-bthwani-error-codes`);
  }
}

if (failures.length > 0) {
  console.error("contract-scope-binding-gate: FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`contract-scope-binding-gate: OK (${enforced.size} Go-derived authorization scopes, ${capabilityContract.capabilities?.length ?? 0} DSH capabilities, ${eligibilityOperations.size} eligibility operations bound directly to runtime enforcement)`);
