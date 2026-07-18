import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, lineNumber, repoRoot, read } from "./_guard-utils.mjs";
import { operationKey, parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "backend-api-binding-gate";
const violations = [];

const runtimeContractStrategies = new Set([
  "PRIMARY_GENERATED",
  "MANUAL_TYPED_ADAPTER",
  "STANDALONE_MANUAL_TYPED_ADAPTER",
]);

function registeredDshRuntimeContracts() {
  const registryFile = "services/dsh/contracts/contract-registry.ts";
  const source = read(registryFile);
  const files = [];
  const entryPattern = /\{[\s\S]*?path:\s*["'](contracts\/[^"']+\.openapi\.yaml)["'][\s\S]*?clientStrategy:\s*["']([^"']+)["'][\s\S]*?\n\s*\},/g;
  for (const match of source.matchAll(entryPattern)) {
    const strategy = match[2];
    if (runtimeContractStrategies.has(strategy)) {
      files.push(`services/dsh/${match[1]}`);
    }
  }
  if (files.length === 0) {
    violations.push({
      file: registryFile,
      line: 0,
      message: "DSH_RUNTIME_CONTRACT_REGISTRY_EMPTY: no runtime-owned DSH contracts were discovered",
    });
  }
  return [...new Set(files)];
}

const dshContracts = registeredDshRuntimeContracts();
const dshPrimary = "services/dsh/contracts/dsh.openapi.yaml";

const services = [
  {
    name: "DSH",
    openapi: dshPrimary,
    additionalOpenapi: dshContracts.filter((file) => file !== dshPrimary),
    router: "services/dsh/backend/internal/http/server.go",
  },
  {
    name: "WLT",
    openapi: "services/wlt/contracts/wlt.openapi.yaml",
    additionalOpenapi: [
      "services/wlt/contracts/wlt.commercial.openapi.yaml",
      "services/wlt/contracts/wlt.commercial-summary.openapi.yaml",
      "services/wlt/contracts/wlt.promotion-funding.openapi.yaml",
    ].filter((file) => fs.existsSync(path.join(repoRoot, file))),
    router: "services/wlt/backend/internal/http/server.go",
  },
  {
    name: "Identity",
    openapi: "core/identity/contracts/auth.openapi.yaml",
    additionalOpenapi: [],
    router: "core/identity/backend/internal/http/server.go",
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
  "POST /wlt/commissions",
  "POST /wlt/ledger/entries",
  "POST /wlt/commercial/products",
  "PATCH /wlt/commercial/products/{productReference}",
  "POST /wlt/commercial/loyalty-entries",
  "POST /wlt/commercial/subscriptions",
]);

const wltFinancialReadRoutes = new Set([
  "GET /wlt/refunds",
  "GET /wlt/refunds/{refundId}",
  "GET /wlt/settlements",
  "GET /wlt/settlements/{settlementId}",
  "GET /wlt/settlements/summary",
  "GET /wlt/cod-records",
  "GET /wlt/cod-records/{codRecordId}",
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

function parseGoStringLiteral(source, quoteIndex) {
  const quote = source[quoteIndex];
  let value = "";
  for (let index = quoteIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote === "`") {
      if (char === "`") return { value, end: index + 1 };
      value += char;
      continue;
    }
    if (char === "\\") {
      value += source[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (char === quote) return { value, end: index + 1 };
    value += char;
  }
  return null;
}

function extractGoRoutes(file) {
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) return [];
  const source = read(file);
  const routes = [];
  const keys = new Set();

  for (const call of ["mux.HandleFunc(", "mux.Handle("]) {
    let searchIndex = 0;
    while (searchIndex < source.length) {
      const callIndex = source.indexOf(call, searchIndex);
      if (callIndex === -1) break;
      searchIndex = callIndex + call.length;
      const relativeQuote = source.slice(searchIndex).search(/["'`]/);
      if (relativeQuote === -1) continue;
      const literalIndex = searchIndex + relativeQuote;
      const literal = parseGoStringLiteral(source, literalIndex);
      if (!literal) continue;
      const routeMatch = literal.value.match(/^([A-Z]+)\s+(\/\S+)$/);
      if (!routeMatch) continue;
      const route = {
        method: routeMatch[1],
        path: routeMatch[2].replace(/\/$/, ""),
        line: lineNumber(source, callIndex),
      };
      const key = `${route.method} ${route.path}`;
      if (!keys.has(key)) {
        keys.add(key);
        routes.push(route);
      }
    }
  }

  try {
    const extractorPath = path.join(repoRoot, "tools/guards/extract_routes.go");
    const relativeFilePath = path.relative(repoRoot, fullPath).replace(/\\/g, "/");
    const stdout = execSync(`go run "${extractorPath}" "${relativeFilePath}"`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const route of JSON.parse(stdout.toString())) {
      if (!route.method || !route.path) continue;
      const normalized = route.path.replace(/\/$/, "");
      const key = `${route.method} ${normalized}`;
      if (keys.has(key)) continue;
      keys.add(key);
      routes.push({
        method: route.method,
        path: normalized,
        line: lineNumber(source, Math.max(0, source.indexOf(key))),
      });
    }
  } catch {
    // Literal extraction remains the fail-safe layer.
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

function validateOperationIds(service, operations) {
  const seen = new Map();
  for (const operation of operations) {
    if (!operation.operationId) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `MISSING_OPERATION_ID: ${operationKey(operation)} has no operationId`,
      });
      continue;
    }
    const previous = seen.get(operation.operationId);
    if (previous) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `DUPLICATE_OPERATION_ID: "${operation.operationId}" already appears in ${operationFile(service, previous)} at line ${previous.line}`,
      });
    }
    seen.set(operation.operationId, operation);
  }
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
  if (operation.extensions.get("x-bthwani-mutation-approved") !== false) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_MUTATION_METADATA: ${key} must set x-bthwani-mutation-approved: false`,
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

for (const service of services) {
  const contracts = contractFiles(service);
  for (const contract of contracts) {
    if (!fs.existsSync(path.join(repoRoot, contract))) {
      violations.push({ file: contract, line: 0, message: `REGISTERED_CONTRACT_NOT_FOUND: ${contract}` });
    }
  }
  const operations = contracts
    .filter((contract) => fs.existsSync(path.join(repoRoot, contract)))
    .flatMap((contractFile) =>
      parseOpenApiContract(contractFile).map((operation) => ({ ...operation, contractFile })),
    );
  openApiRoutesByService.set(service.name, operations);
  validateOperationIds(service, operations);

  const openApiRouteSet = new Set(operations.map(operationKey));
  const goRoutes = extractGoRoutes(service.router);
  const goRouteSet = new Set(goRoutes.map((route) => `${route.method} ${route.path}`));

  for (const route of goRoutes) {
    const key = `${route.method} ${route.path}`;
    if (!openApiRouteSet.has(key)) {
      violations.push({
        file: service.router,
        line: route.line,
        message: `FORBIDDEN_ROUTE: Route "${key}" is registered in Go but not documented in: ${contracts.join(", ")}`,
      });
    }
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
