import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, read } from "./_guard-utils.mjs";
import { operationKey, parseOpenApiContract } from "./_openapi-utils.mjs";
import {
  cleanupGoRouteExtractor,
  extractGoRoutes,
  routeKey,
} from "./lib/go-route-extractor.mjs";
import { dshContractRegistrations } from "../scripts/contract-client-metadata.mjs";

const guardId = "backend-api-binding-gate";
const violations = [];
const draftContractStateCache = new Map();
const nonActiveStates = new Set(["CONTRACT_DRAFT", "RESERVED"]);

// A contract carrying CONTRACT_DRAFT or RESERVED documents a capability that
// is not live yet (contracts-foundation.mjs already forbids client generation
// for these states). Implementation-parity is meaningless for them; every
// other check (operationId, path params, etc.) still applies.
function isNonActiveContract(file) {
  if (!draftContractStateCache.has(file)) {
    const absolute = path.join(repoRoot, file);
    let state = "CONTRACT_ACTIVE";
    if (fs.existsSync(absolute)) {
      const match = read(file).match(/^x-bthwani-contract-state:\s*(\S+)/m);
      if (match) state = match[1];
    }
    draftContractStateCache.set(file, state);
  }
  return nonActiveStates.has(draftContractStateCache.get(file));
}
const dshRegistryFile = "services/dsh/contracts/contract.manifest.yaml";
const routeClassificationFile =
  "services/dsh/contracts/backend-route-classification.json";
const dshPrimary = "services/dsh/contracts/dsh.openapi.yaml";

function registeredDshContracts() {
  try {
    const entries = dshContractRegistrations().map(({ file, strategy }) => ({ file, strategy }));
    if (entries.length > 0) return entries;
  } catch (error) {
    violations.push({
      file: dshRegistryFile,
      line: 0,
      message: `DSH_CONTRACT_MANIFEST_INVALID: ${error.message}`,
    });
  }
  violations.push({
    file: dshRegistryFile,
    line: 0,
    message: "DSH_RUNTIME_CONTRACT_MANIFEST_EMPTY: no DSH contracts were discovered",
  });
  return [];
}

function loadRouteClassifications() {
  const absolute = path.join(repoRoot, routeClassificationFile);
  if (!fs.existsSync(absolute)) return new Map();
  let document;
  try {
    document = JSON.parse(read(routeClassificationFile));
  } catch (error) {
    violations.push({
      file: routeClassificationFile,
      line: 0,
      message: `ROUTE_CLASSIFICATION_INVALID_JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    return new Map();
  }
  if (
    document.schemaVersion !== 1 ||
    document.service !== "DSH" ||
    !Array.isArray(document.routes)
  ) {
    violations.push({
      file: routeClassificationFile,
      line: 0,
      message:
        "ROUTE_CLASSIFICATION_INVALID_DOCUMENT: schemaVersion=1, service=DSH and routes[] are required",
    });
    return new Map();
  }
  const result = new Map();
  for (const [index, item] of document.routes.entries()) {
    const line = index + 1;
    if (
      !item ||
      typeof item.route !== "string" ||
      typeof item.canonicalRoute !== "string" ||
      item.classification !== "LEGACY_COMPATIBILITY" ||
      item.retirementState !== "DEPRECATED_SUPPORTED" ||
      typeof item.owner !== "string" ||
      item.owner.trim() === "" ||
      typeof item.migrationLifecycle !== "string" ||
      item.migrationLifecycle.trim() === "" ||
      typeof item.retirementCriteria !== "string" ||
      item.retirementCriteria.trim() === "" ||
      typeof item.expiryOrClosure !== "string" ||
      item.expiryOrClosure.trim() === ""
    ) {
      violations.push({
        file: routeClassificationFile,
        line,
        message:
          "MALFORMED_ROUTE_CLASSIFICATION: every route must define a legacy route, canonical route, owner, migrationLifecycle, retirementCriteria, expiryOrClosure and governed retirement state",
      });
      continue;
    }
    if (result.has(item.route)) {
      violations.push({
        file: routeClassificationFile,
        line,
        message: `DUPLICATE_ROUTE_CLASSIFICATION: ${item.route}`,
      });
      continue;
    }
    result.set(item.route, item);
  }
  return result;
}

const dshRegistry = registeredDshContracts();
const dshRegisteredFiles = new Set(dshRegistry.map((entry) => entry.file));
const dshExplicitRuntimeContracts = [
  "services/dsh/contracts/dsh.reels.openapi.yaml",
  "services/dsh/contracts/dsh.runtime-extensions.openapi.yaml",
];
const dshAdditionalContracts = [
  ...dshRegistry
    .map((entry) => entry.file)
    .filter((file) => file !== dshPrimary),
  ...dshExplicitRuntimeContracts,
].filter((file, index, values) => values.indexOf(file) === index);
const dshClientAddressContract =
  "services/dsh/contracts/dsh.client-address.openapi.yaml";
if (!dshRegisteredFiles.has(dshClientAddressContract)) {
  violations.push({
    file: dshRegistryFile,
    line: 0,
    message: `DSH_CLIENT_ADDRESS_CONTRACT_UNREGISTERED: ${dshClientAddressContract} must stay registered`,
  });
}

const routeClassifications = loadRouteClassifications();
const services = [
  {
    name: "DSH",
    openapi: dshPrimary,
    additionalOpenapi: dshAdditionalContracts,
    router: "services/dsh/backend/internal/http/server.go",
    routerDir: "services/dsh/backend/internal/http",
  },
  {
    name: "WLT",
    openapi: "services/wlt/contracts/generated/wlt.bundle.openapi.yaml",
    router: "services/wlt/backend/internal/http/server.go",
    routerDir: "services/wlt/backend/internal/http",
  },
  {
    name: "Identity",
    openapi: "core/identity/contracts/identity.openapi.yaml",
    additionalOpenapi: [
      "core/identity/contracts/employee-access.openapi.yaml",
      "core/identity/contracts/identity.rbac-admin.openapi.yaml",
      "core/identity/contracts/identity.support-sessions.openapi.yaml",
    ],
    router: "core/identity/backend/internal/http/server.go",
    routerDir: "core/identity/backend/internal/http",
  },
  {
    name: "Workforce",
    openapi: "core/workforce/contracts/workforce.openapi.yaml",
    additionalOpenapi: [
      "core/workforce/contracts/workforce.operational-core.openapi.yaml",
      "core/workforce/contracts/workforce.reference-mutations.openapi.yaml",
      "core/workforce/contracts/workforce.sovereign-leadership.openapi.yaml",
      "core/workforce/contracts/workforce.internal-scopes.openapi.yaml",
    ],
    router: "core/workforce/backend/internal/http/server.go",
    routerDir: "core/workforce/backend/internal/http",
  },
  {
    name: "Providers",
    openapi: "core/providers/contracts/providers.openapi.yaml",
    router: "core/providers/backend/internal/http/server.go",
    routerDir: "core/providers/backend/internal/http",
  },
  {
    name: "PlatformControl",
    openapi: "core/platform-control/contracts/platform-control.openapi.yaml",
    additionalOpenapi: [
      "core/platform-control/contracts/platform-change-sets.openapi.yaml",
      "core/platform-control/contracts/platform-progressive-rollout.openapi.yaml",
    ],
    router: "core/platform-control/backend/internal/http/server.go",
    routerDir: "core/platform-control/backend/internal/http",
  },
];

const gatedWltMutationRoutes = new Set([
  "POST /wlt/payment-sessions/{paymentSessionId}/authorize",
  "POST /wlt/payment-sessions/{paymentSessionId}/capture",
  "POST /wlt/payment-sessions/{paymentSessionId}/expire",
  "POST /wlt/cod-reservations/reserve",
  "POST /wlt/cod-reservations/release",
  "POST /wlt/cod-reservations/finalize",
  "POST /wlt/refunds",
  "POST /wlt/refunds/{refundId}/approve",
  "POST /wlt/refunds/{refundId}/complete",
  "POST /wlt/refunds/{refundId}/reject",
  "POST /wlt/settlements",
  "POST /wlt/settlements/{settlementId}/post",
  "POST /wlt/commissions",
  "POST /wlt/commercial/products",
  "PATCH /wlt/commercial/products/{productReference}",
  "POST /wlt/commercial/loyalty-entries",
  "POST /wlt/commercial/subscriptions",
  "PUT /wlt/commercial/store-onboarding-fee",
]);
const approvedWltMutationScopes = new Set(["POST /wlt/settlements"]);
const wltFinancialReadRoutes = new Set([
  "GET /wlt/refunds",
  "GET /wlt/refunds/{refundId}",
  "GET /wlt/settlements",
  "GET /wlt/settlements/{settlementId}",
  "GET /wlt/settlements/summary",
  "GET /wlt/cod-reservations/{orderId}",
  "GET /wlt/commissions",
  "GET /wlt/ledger/entries",
  "GET /wlt/ledger/entries/{entryId}",
  "GET /wlt/commercial/summary",
  "GET /wlt/commercial/products/{productReference}",
  "GET /wlt/commercial/clients/{clientId}/benefits",
  "GET /wlt/commercial/store-onboarding-fee",
]);

function contractFiles(service) {
  return [service.openapi, ...(service.additionalOpenapi ?? [])];
}

function operationFile(service, operation) {
  return operation.contractFile ?? service.openapi;
}

function serviceGoRoutes(service) {
  // extract_routes.go receives one file as the package entry point and then
  // discovers every non-test Go file beside it. Calling it once per file
  // re-parses the whole router package O(n²) and spawns hundreds of Go
  // processes for the DSH router.
  const routes = extractGoRoutes(service.router);
  const keys = new Set();
  const uniqueRoutes = [];
  for (const route of routes) {
    const key = routeKey(route);
    if (keys.has(key)) continue;
    keys.add(key);
    uniqueRoutes.push({ ...route, file: service.router });
  }
  return uniqueRoutes;
}

function hasRequiredHeader(operation, headerName) {
  return operation.parameters.some(
    (parameter) =>
      parameter.in === "header" &&
      parameter.required === true &&
      parameter.name.toLowerCase() === headerName.toLowerCase(),
  );
}

function uniqueOperations(service, operations) {
  const seen = new Map();
  const unique = [];
  for (const operation of operations) {
    if (!operation.operationId) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `MISSING_OPERATION_ID: ${operationKey(operation)} has no operationId`,
      });
      unique.push(operation);
      continue;
    }
    const previous = seen.get(operation.operationId);
    if (previous) {
      if (operationKey(previous) === operationKey(operation)) continue;
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `DUPLICATE_OPERATION_ID: "${operation.operationId}" already appears in ${operationFile(
          service,
          previous,
        )} at line ${previous.line}`,
      });
      continue;
    }
    seen.set(operation.operationId, operation);
    unique.push(operation);
  }
  return unique;
}

function validatePathParameters(service, operation) {
  const declared = new Set(
    operation.parameters
      .filter((parameter) => parameter.in === "path")
      .map((parameter) => parameter.name),
  );
  for (const pathParam of operation.pathParams) {
    if (pathParam.wildcard) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `FORBIDDEN_WILDCARD_CONTRACT: ${operationKey(operation)} uses wildcard path parameter "${pathParam.rawName}"`,
      });
    }
    if (!declared.has(pathParam.name)) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `MISSING_PATH_PARAMETER: ${operationKey(operation)} does not declare path parameter "${pathParam.name}"`,
      });
    }
  }
}

function validateInternalServiceRoute(service, operation) {
  if (!operation.path.includes("/internal/")) return;
  if (!operation.hasSecurity) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_INTERNAL_SECURITY: ${operationKey(operation)} must define security`,
    });
  }
  for (const header of ["Authorization", "X-Service-Caller"]) {
    if (!hasRequiredHeader(operation, header)) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `MISSING_INTERNAL_HEADER: ${operationKey(operation)} must require ${header}`,
      });
    }
  }
}

function validateWltOperation(service, operation) {
  if (service.name !== "WLT") return;
  const key = operationKey(operation);
  if (wltFinancialReadRoutes.has(key)) {
    for (const header of ["Authorization", "X-Service-Caller"]) {
      if (!hasRequiredHeader(operation, header)) {
        violations.push({
          file: operationFile(service, operation),
          line: operation.line,
          message: `MISSING_FINANCIAL_READ_HEADER: ${key} is missing required header ${header}`,
        });
      }
    }
  }
  if (!gatedWltMutationRoutes.has(key)) return;
  const expectedApproved = approvedWltMutationScopes.has(key);
  if (
    operation.extensions.get("x-bthwani-mutation-approved") !== expectedApproved
  ) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_MUTATION_METADATA: ${key} must set x-bthwani-mutation-approved: ${expectedApproved}`,
    });
  }
  if (operation.extensions.get("x-bthwani-default-enabled") !== false) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_MUTATION_METADATA: ${key} must set x-bthwani-default-enabled: false`,
    });
  }
  if (!operation.responses.has("403")) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_FEATURE_GATE_RESPONSE: ${key} must document 403 FEATURE_NOT_ENABLED`,
    });
  }
}

const openApiRoutesByService = new Map();
try {
  for (const service of services) {
    const contracts = contractFiles(service);
    for (const contract of contracts) {
      if (!fs.existsSync(path.join(repoRoot, contract))) {
        violations.push({
          file: contract,
          line: 0,
          message: `REGISTERED_CONTRACT_NOT_FOUND: ${contract}`,
        });
      }
    }
    const parsedOperations = contracts
      .filter((contract) => fs.existsSync(path.join(repoRoot, contract)))
      .flatMap((contractFile) =>
        parseOpenApiContract(contractFile).map((operation) => ({
          ...operation,
          contractFile,
        })),
      );
    const operations = uniqueOperations(service, parsedOperations);
    openApiRoutesByService.set(service.name, operations);
    const openApiRouteSet = new Set(operations.map(operationKey));
    const goRoutes = serviceGoRoutes(service);
    const goRouteSet = new Set(goRoutes.map(routeKey));

    for (const route of goRoutes) {
      const key = routeKey(route);
      if (key === "/" || openApiRouteSet.has(key)) continue;
      const classification =
        service.name === "DSH" ? routeClassifications.get(key) : undefined;
      if (classification) {
        if (!openApiRouteSet.has(classification.canonicalRoute)) {
          violations.push({
            file: routeClassificationFile,
            line: 0,
            message: `LEGACY_CANONICAL_ROUTE_MISSING: ${key} points to absent ${classification.canonicalRoute}`,
          });
        }
        continue;
      }
      violations.push({
        file: route.file,
        line: route.line,
        message: `FORBIDDEN_ROUTE: Route "${key}" is registered in Go but is neither documented nor governed as a bounded legacy compatibility route`,
      });
    }

    for (const operation of operations) {
      const key = operationKey(operation);
      validatePathParameters(service, operation);
      validateInternalServiceRoute(service, operation);
      validateWltOperation(service, operation);
      if (
        !goRouteSet.has(key) &&
        !isNonActiveContract(operationFile(service, operation))
      ) {
        violations.push({
          file: operationFile(service, operation),
          line: operation.line,
          message: `MISSING_IMPLEMENTATION: Route "${key}" is not registered in ${service.router}`,
        });
      }
    }

    if (service.name === "DSH") {
      for (const [legacyRoute, classification] of routeClassifications) {
        if (!goRouteSet.has(legacyRoute)) {
          violations.push({
            file: routeClassificationFile,
            line: 0,
            message: `STALE_ROUTE_CLASSIFICATION: ${legacyRoute} is classified but no longer registered`,
          });
        }
        if (!openApiRouteSet.has(classification.canonicalRoute)) {
          violations.push({
            file: routeClassificationFile,
            line: 0,
            message: `STALE_CANONICAL_ROUTE_CLASSIFICATION: ${classification.canonicalRoute} is not active`,
          });
        }
      }
    }
  }
} finally {
  cleanupGoRouteExtractor();
}

function verifyOutboundCall(targetService, method, pathValue, sourceFile, line) {
  const operations = openApiRoutesByService.get(targetService) ?? [];
  const key = `${method} ${pathValue}`;
  if (operations.some((operation) => operationKey(operation) === key)) return;
  if (
    pathValue.endsWith("/") &&
    operations.some(
      (operation) =>
        operation.method === method &&
        operation.path.startsWith(pathValue) &&
        operation.path
          .slice(pathValue.length)
          .match(/^\{[^}]+\}(\/\{[^}]+\})*$/),
    )
  ) {
    return;
  }
  violations.push({
    file: sourceFile,
    line,
    message: `FORBIDDEN_CROSS_SERVICE_CALL: Outbound request "${key}" to ${targetService} is not documented`,
  });
}

function scanOutboundLiterals(file, targetService, prefix) {
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) return;
  const source = read(file);
  const literalRegex = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match;
  while ((match = literalRegex.exec(source))) {
    const literal = match[2];
    if (!literal.startsWith(prefix) || literal.includes("${")) continue;
    const before = source.slice(Math.max(0, match.index - 160), match.index);
    let method = "GET";
    if (/MethodPost|["']POST["']/.test(before)) method = "POST";
    if (/MethodPut|["']PUT["']/.test(before)) method = "PUT";
    if (/MethodPatch|["']PATCH["']/.test(before)) method = "PATCH";
    if (/MethodDelete|["']DELETE["']/.test(before)) method = "DELETE";
    verifyOutboundCall(
      targetService,
      method,
      literal,
      file,
      lineNumber(source, match.index),
    );
  }
}

scanOutboundLiterals(
  "services/dsh/backend/internal/wlt/client.go",
  "WLT",
  "/wlt/",
);
scanOutboundLiterals(
  "services/dsh/backend/internal/wlt/commercial.go",
  "WLT",
  "/wlt/",
);
scanOutboundLiterals(
  "services/wlt/backend/internal/dshnotify/client.go",
  "DSH",
  "/dsh/",
);

fail(guardId, violations);
