#!/usr/bin/env node
// Verifies that every authorization scope/permission enforced by Go route
// guards has a matching entry in tools/verification/security-scope-vocabulary.json,
// and that the vocabulary carries no stale entries.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { extractGoRoutes } from "./lib/go-route-extractor.mjs";
import {
  findMatchingDelimiter,
  listGoFiles,
  parseGoStringLiteral,
} from "./lib/go-scanner.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const vocabularyRelative = "tools/verification/security-scope-vocabulary.json";
const vocabulary = JSON.parse(fs.readFileSync(path.join(repositoryRoot, vocabularyRelative), "utf8"));
const failures = [];

const dynamicallyEnforcedScopes = new Map([
  [
    "catalog.proposal.adopt",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: decideProposalPermissionAction/proposalTransitionPermissionAction",
  ],
  [
    "catalog.proposal.review",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: decideProposalPermissionAction/proposalTransitionPermissionAction",
  ],
  [
    "catalog.proposal.marketing_review",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: proposalTransitionPermissionAction",
  ],
  [
    "catalog.proposal.publish",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: proposalTransitionPermissionAction",
  ],
]);

const declared = new Set();
for (const family of vocabulary.families ?? []) {
  for (const entry of family.scopes ?? []) {
    if (declared.has(entry.scope)) failures.push(`${vocabularyRelative}: duplicate scope '${entry.scope}'`);
    declared.add(entry.scope);
  }
}

function relativeGoFiles(rootRelative) {
  const root = path.join(repositoryRoot, rootRelative);
  return listGoFiles(root, { recursive: true }).map((absolute) => ({
    absolute,
    relative: path.relative(repositoryRoot, absolute).replaceAll("\\", "/"),
  }));
}

const scanTargets = [
  {
    root: "core/workforce/backend",
    patterns: [
      /operatorOnly\(\s*"([^"]+)"/g,
      /providerSelf\(\s*"([^"]+)"/g,
      /anyAuthenticated\(\s*"([^"]+)"/g,
      /resolveReferenceOperator\([^)]*?,\s*"([^"]+)"\s*\)/g,
      /identity\.HasPermission\(\s*"[^"]*",\s*"([^"]+)"/g,
      /hasWorkforceScope\(\s*identity,\s*"([^"]+)"/g,
      /changeDepartmentEmployeeStatus\([^)]*?,\s*"([^"]+)"/g,
      /requireEmployeeTarget\(\s*w,\s*identity,\s*"([^"]+)"/g,
    ],
  },
  {
    root: "core/providers/backend",
    patterns: [
      /operatorOnly\(\s*"([^"]+)"/g,
      /identity\.HasPermission\(\s*"[^"]*",\s*"([^"]+)"/g,
    ],
  },
  {
    root: "core/platform-control/backend",
    patterns: [
      /operatorOnly\(\s*"([^"]+)"/g,
      /identity\.HasPermission\(\s*"[^"]*",\s*"([^"]+)"/g,
    ],
  },
  {
    root: "services/dsh/backend",
    patterns: [
      /requirePermission\(\s*w,\s*r,\s*"[^"]*",\s*"([a-zA-Z][a-zA-Z0-9_.:-]*)"/g,
      /require(?!Permission\()[A-Za-z]*Permission\(\s*w,\s*r,\s*(?:"[^"]*",\s*)?"([a-zA-Z][a-zA-Z0-9_.:-]*)"/g,
      /require[A-Za-z]*Permission\(\s*w,\s*r,\s*(?:"[^"]*",\s*)?([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*[,)]/g,
      /serve[A-Za-z]*PermissionHandler\(\s*w,\s*r,[\s\S]*?,\s*([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*[,)]/g,
    ],
  },
];

function collectDshPermissionConstants() {
  const constants = new Map();
  const constPattern = /([A-Za-z]+Permission[A-Za-z]*)\s*=\s*"([a-zA-Z0-9_.:-]+)"/g;
  for (const { absolute } of relativeGoFiles("services/dsh/backend")) {
    const text = fs.readFileSync(absolute, "utf8");
    for (const match of text.matchAll(constPattern)) constants.set(match[1], match[2]);
  }
  return constants;
}

const dshConstants = collectDshPermissionConstants();

function resolveDshPermissionExpression(expression, context, { reportFailure = true } = {}) {
  if (!expression) {
    if (reportFailure) failures.push(`${context}: missing permission expression`);
    return undefined;
  }
  const literal = parseGoStringLiteral(expression);
  if (literal) return literal;
  const identifier = expression.trim();
  if (/^[A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*$/.test(identifier)) {
    const resolved = dshConstants.get(identifier);
    if (resolved) return resolved;
    if (reportFailure) failures.push(`${context}: unresolved permission constant '${identifier}'`);
    return undefined;
  }
  if (reportFailure) failures.push(`${context}: unsupported permission expression '${identifier}'`);
  return undefined;
}

const enforced = new Set(dynamicallyEnforcedScopes.keys());
for (const target of scanTargets) {
  for (const { absolute, relative } of relativeGoFiles(target.root)) {
    const text = fs.readFileSync(absolute, "utf8");
    for (const pattern of target.patterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const token = match[1];
        if (!token) continue;
        if (/^[A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*$/.test(token) && !token.includes(".")) {
          const resolved = dshConstants.get(token);
          if (resolved) enforced.add(resolved);
          else failures.push(`services/dsh/backend: unresolved permission constant '${token}' referenced in ${relative}`);
        } else {
          enforced.add(token);
        }
      }
    }
  }
}

const dshRoutes = extractGoRoutes("services/dsh/backend/internal/http/server.go");
for (const route of dshRoutes) {
  if (route.handler.kind !== "withPermission") continue;
  const relative = path.relative(repositoryRoot, route.filePath).replaceAll("\\", "/");
  const permission = resolveDshPermissionExpression(
    route.handler.permissionExpression,
    `${relative}:${route.line} ${route.route}`,
  );
  if (permission) enforced.add(permission);
}

for (const scope of enforced) {
  if (!declared.has(scope)) failures.push(`Go enforces scope '${scope}' with no entry in ${vocabularyRelative}`);
}
for (const scope of declared) {
  if (!enforced.has(scope)) failures.push(`${vocabularyRelative}: scope '${scope}' is declared but enforced nowhere in Go`);
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
  const permission = route.handler.kind === "withPermission"
    ? resolveDshPermissionExpression(route.handler.permissionExpression, `${relative}:${route.line} ${route.route}`, { reportFailure: false })
    : undefined;
  routeBindings.set(route.route, {
    handler: route.handler.handlerName,
    file: relative,
    permission,
  });
}

function findHandlerSource(handlerName) {
  if (!handlerName) return null;
  const signature = `func (s *protectedStoreServer) ${handlerName}(`;
  for (const { absolute, relative } of relativeGoFiles("services/dsh/backend/internal/http")) {
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
    if (!Array.isArray(permissions) || permissions.length !== 1 || !declared.has(permissions[0])) {
      failures.push(`${eligibilityContractRelative}: ${operationId} must declare exactly one vocabulary-backed permission`);
      continue;
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

console.log(`contract-scope-binding-gate: OK (${declared.size} declared scopes, ${enforced.size} enforced scopes, ${eligibilityOperations.size} eligibility operations bound to Go routes and contract metadata)`);
