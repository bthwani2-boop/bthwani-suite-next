import fs from "node:fs";
import path from "node:path";
import { fail, lineNumber, repoRoot, read } from "./_guard-utils.mjs";
import { operationKey, parseOpenApiContract } from "./_openapi-utils.mjs";
import {
  cleanupGoRouteExtractor,
  extractGoRoutes,
  routeKey,
} from "./lib/go-route-extractor.mjs";

const guardId = "backend-api-binding-gate";
const violations = [];
const dshRegistryFile = "services/dsh/contracts/contract-registry.ts";
const routeClassificationFile = "services/dsh/contracts/backend-route-classification.json";
const dshPrimary = "services/dsh/contracts/dsh.openapi.yaml";

function registeredDshContracts() {
  const source = read(dshRegistryFile);
  const entries = [];
  const entryPattern = /\{[\s\S]*?path:\s*["'](contracts\/[^"']+\.openapi\.yaml)["'][\s\S]*?clientStrategy:\s*["']([^"']+)["'][\s\S]*?\n\s*\},/g;
  for (const match of source.matchAll(entryPattern)) {
    entries.push({ file: `services/dsh/${match[1]}`, strategy: match[2] });
  }
  if (entries.length === 0) {
    violations.push({
      file: dshRegistryFile,
      line: 0,
      message: "DSH_RUNTIME_CONTRACT_REGISTRY_EMPTY: no DSH contracts were discovered",
    });
  }
  return entries;
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
      message: `ROUTE_CLASSIFICATION_INVALID_JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return new Map();
  }

  if (document.schemaVersion !== 1 || document.service !== "DSH" || !Array.isArray(document.routes)) {
    violations.push({
      file: routeClassificationFile,
      line: 0,
      message: "ROUTE_CLASSIFICATION_INVALID_DOCUMENT: schemaVersion=1, service=DSH and routes[] are required",
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
      item.owner.trim() === ""
    ) {
      violations.push({
        file: routeClassificationFile,
        line,
        message: "MALFORMED_ROUTE_CLASSIFICATION: every route must define a legacy route, canonical route, owner and governed retirement state",
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
const dshAdditionalContracts = dshRegistry
  .map((entry) => entry.file)
  .filter((file) => file !== dshPrimary);
const dshClientAddressContract = "services/dsh/contracts/dsh.client-address.openapi.yaml";
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
    openapi: "services/wlt/contracts/wlt.openapi.yaml",
    additionalOpenapi: [
      "services/wlt/contracts/wlt.payments.openapi.yaml",
      "services/wlt/contracts/wlt.commercial.openapi.yaml",
      "services/wlt/contracts/wlt.commercial-summary.openapi.yaml",
      "services/wlt/contracts/wlt.promotion-funding.openapi.yaml",
      "services/wlt/contracts/jrn-035-refunds.openapi.yaml",
      "services/wlt/contracts/jrn-036-settlements-commissions.openapi.yaml",
      "services/wlt/contracts/jrn-037-payouts-destinations.openapi.yaml",
      "services/wlt/contracts/jrn-038-cod-custody.openapi.yaml",
    ].filter((file) => fs.existsSync(path.join(repoRoot, file))),
    router: "services/wlt/backend/internal/http/server.go",
    routerDir: "services/wlt/backend/internal/http",
  },
  {
    name: "Identity",
    openapi: "core/identity/contracts/auth.openapi.yaml",
    additionalOpenapi: [],
    router: "core/identity/backend/internal/http/server.go",
    routerDir: "core/identity/backend/internal/http",
  },
];

const gatedWltMutationRoutes = new Set([
  "POST /wlt/payment-sessions/{paymentSessionId}/authorize",
  "POST /wlt/payment-sessions/{paymentSessionId}/capture",
  "POST /wlt/payment-sessions/{paymentSessionId}/expire",
  "POST /wlt/payment-sessions/{paymentSessionId}/cod-collect",
  "POST /wlt/refunds",
  "POST /wlt/refunds/{refundId}/approve",
  "POST /wlt/refunds/{refundId}/complete",
  "POST /wlt/refunds/{refundId}/reject",
  "POST /wlt/settlements",
  "POST /wlt/settlements/{settlementId}/post",
  "POST /wlt/cod-records/{codRecordId}/collect",
  "POST /wlt/cod-records/{codRecordId}/remit",
  "POST /wlt/delivery-collections/{codRecordId}/collect",
  "POST /wlt/delivery-collections/{codRecordId}/remit",
  "POST /wlt/commissions",
  "POST /wlt/ledger/entries",
  "POST /wlt/commercial/products",
  "PATCH /wlt/commercial/products/{productReference}",
  "POST /wlt/commercial/loyalty-entries",
  "POST /wlt/commercial/subscriptions",
]);
const approvedWltMutationScopes = new Set(["POST /wlt/settlements"]);
const wltFinancialReadRoutes = new Set([
  "GET /wlt/refunds",
  "GET /wlt/refunds/{refundId}",
  "GET /wlt/settlements",
  "GET /wlt/settlements/{settlementId}",
  "GET /wlt/settlements/summary",
  "GET /wlt/cod-records",
  "GET /wlt/cod-records/{codRecordId}",
  "GET /wlt/delivery-collections",
  "GET /wlt/delivery-collections/{codRecordId}",
  "GET /wlt/commissions",
  "GET /wlt/ledger/entries",
  "GET /wlt/ledger/entries/{entryId}",
  "GET /wlt/commercial/summary",
  "GET /wlt/commercial/products/{productReference}",
  "GET /wlt/commercial/clients/{clientId}/benefits",
]);

function contractFiles(service) {
  return [service.openapi, ...(service.additionalOpenapi ?? [])];
}

function operationFile(service, operation) {
  return operation.contractFile ?? service.openapi;
}

function serviceGoRoutes(service) {
  const files = [service.router];
  if (service.routerDir) {
    const dirPath = path.join(repoRoot, service.routerDir);
    if (fs.existsSync(dirPath)) {
      for (const entry of fs.readdirSync(dirPath)) {
        if (!entry.endsWith(".go") || entry.endsWith("_test.go")) continue;
        const relative = `${service.routerDir}/${entry}`;
        if (!files.includes(relative)) files.push(relative);
      }
    }
  }

  const routes = [];
  const keys = new Set();
  for (const file of files) {
    for (const route of extractGoRoutes(file)) {
      const key = routeKey(route);
      if (keys.has(key)) continue;
      keys.add(key);
      routes.push({ ...route, file });
    }
  }
  return routes;
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
        message: `DUPLICATE_OPERATION_ID: "${operation.operationId}" already appears in ${operationFile(service, previous)} at line ${previous.line}`,
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
  if (operation.extensions.get("x-bthwani-mutation-approved") !== expectedApproved) {
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
        parseOpenApiContract(contractFile).map((operation) => ({ ...operation, contractFile })),
      );
    const operations = uniqueOperations(service, parsedOperations);
    openApiRoutesByService.set(service.name, operations);

    const openApiRouteSet = new Set(operations.map(operationKey));
    const goRoutes = serviceGoRoutes(service);
    const goRouteSet = new Set(goRoutes.map(routeKey));

    for (const route of goRoutes) {
      const key = routeKey(route);
      if (key === "/" || openApiRouteSet.has(key)) continue;
      const classification = service.name === "DSH" ? routeClassifications.get(key) : undefined;
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
      if (!goRouteSet.has(key)) {
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
        operation.path.slice(pathValue.length).match(/^\{[^}]+\}(\/\{[^}]+\})*$/),
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
    verifyOutboundCall(targetService, method, literal, file, lineNumber(source, match.index));
  }
}

scanOutboundLiterals("services/dsh/backend/internal/wlt/client.go", "WLT", "/wlt/");
scanOutboundLiterals("services/dsh/backend/internal/wlt/commercial.go", "WLT", "/wlt/");
scanOutboundLiterals("services/wlt/backend/internal/dshnotify/client.go", "DSH", "/dsh/");

fail(guardId, violations);
