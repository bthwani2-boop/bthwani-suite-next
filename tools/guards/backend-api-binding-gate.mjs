import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fail, lineNumber, repoRoot, read } from "./_guard-utils.mjs";
import { operationKey, parseOpenApiContract } from "./_openapi-utils.mjs";

const guardId = "backend-api-binding-gate";
const violations = [];

const services = [
  {
    name: "DSH",
    openapi: "services/dsh/contracts/dsh.openapi.yaml",
    additionalOpenapi: [
      "services/dsh/contracts/dsh.client-address.openapi.yaml",
      "services/dsh/contracts/dsh.marketing-commercial.openapi.yaml",
      "services/dsh/contracts/dsh.partner-fleet.openapi.yaml",
    ],
    router: "services/dsh/backend/internal/http/server.go",
  },
  {
    name: "WLT",
    openapi: "services/wlt/contracts/wlt.openapi.yaml",
    additionalOpenapi: [
      "services/wlt/contracts/wlt.commercial.openapi.yaml",
      "services/wlt/contracts/wlt.commercial-summary.openapi.yaml",
    ],
    router: "services/wlt/backend/internal/http/server.go",
  },
  {
    name: "Identity",
    openapi: "core/identity/contracts/auth.openapi.yaml",
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

function contractFiles(service) {
  return [service.openapi, ...(service.additionalOpenapi ?? [])];
}

function operationFile(service, operation) {
  return operation.contractFile ?? service.openapi;
}

function parseGoStringLiteral(source, quoteIndex) {
  const quote = source[quoteIndex];
  let value = "";
  for (let i = quoteIndex + 1; i < source.length; i++) {
    const char = source[i];
    if (quote === "`") {
      if (char === "`") return { value, end: i + 1 };
      value += char;
      continue;
    }

    if (char === "\\") {
      value += source[i + 1] ?? "";
      i++;
      continue;
    }
    if (char === quote) return { value, end: i + 1 };
    value += char;
  }
  return null;
}

function extractGoRoutes(file) {
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) return [];

  const source = read(file);
  const literalRoutes = [];
  const calls = ["mux.HandleFunc(", "mux.Handle("];

  for (const call of calls) {
    let searchIndex = 0;
    while (searchIndex < source.length) {
      const callIndex = source.indexOf(call, searchIndex);
      if (callIndex === -1) break;
      searchIndex = callIndex + call.length;

      const quoteIndex = source.slice(searchIndex).search(/["'`]/);
      if (quoteIndex === -1) continue;
      const literalIndex = searchIndex + quoteIndex;
      const literal = parseGoStringLiteral(source, literalIndex);
      if (!literal) continue;

      const routeMatch = literal.value.match(/^([A-Z]+)\s+(\/\S+)$/);
      if (!routeMatch) continue;
      literalRoutes.push({
        method: routeMatch[1],
        path: routeMatch[2].replace(/\/$/, ""),
        line: lineNumber(source, callIndex),
      });
    }
  }

  try {
    const extractorPath = path.join(repoRoot, "tools/guards/extract_routes.go");
    const relativeFilePath = path.relative(repoRoot, fullPath).replace(/\\/g, "/");
    const stdout = execSync(`go run "${extractorPath}" "${relativeFilePath}"`, { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] });
    const astRoutes = JSON.parse(stdout.toString());
    const literalKeys = new Set(literalRoutes.map((route) => `${route.method} ${route.path}`));
    for (const route of astRoutes) {
      if (route.method === "" || route.path === "") continue;
      const key = `${route.method} ${route.path}`;
      if (!literalKeys.has(key)) {
        let line = 1;
        const index = source.indexOf(key);
        if (index !== -1) line = lineNumber(source, index);
        literalRoutes.push({
          method: route.method,
          path: route.path.replace(/\/$/, ""),
          line,
        });
      }
    }
  } catch {
    // Literal scanning remains the fail-safe extraction layer.
  }

  return literalRoutes;
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
  const declaredPathParams = new Set(
    operation.parameters.filter((parameter) => parameter.in === "path").map((parameter) => parameter.name),
  );

  for (const pathParam of operation.pathParams) {
    if (pathParam.wildcard) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `FORBIDDEN_WILDCARD_CONTRACT: ${operationKey(operation)} uses wildcard path parameter "${pathParam.rawName}"`,
      });
    }
    if (!declaredPathParams.has(pathParam.name)) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `MISSING_PATH_PARAMETER: ${operationKey(operation)} does not declare path parameter "${pathParam.name}"`,
      });
    }
  }
}

function hasRequiredHeader(operation, headerName) {
  return operation.parameters.some(
    (parameter) =>
      parameter.in === "header" &&
      parameter.required === true &&
      parameter.name.toLowerCase() === headerName.toLowerCase(),
  );
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

function validateWltFinancialReadRoute(service, operation) {
  if (service.name !== "WLT") return;
  const key = `${operation.method} ${operation.path}`;
  if (!wltFinancialReadRoutes.has(key)) return;

  for (const header of ["Authorization", "X-Service-Caller"]) {
    if (!hasRequiredHeader(operation, header)) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `MISSING_FINANCIAL_READ_HEADER: WLT financial read route "${key}" is missing required header "${header}"`,
      });
    }
  }
}

function validateWltMutationMetadata(service, operation) {
  if (service.name !== "WLT") return;
  if (!gatedWltMutationRoutes.has(operationKey(operation))) return;

  const mutationApproved = operation.extensions.get("x-bthwani-mutation-approved");
  const defaultEnabled = operation.extensions.get("x-bthwani-default-enabled");
  if (mutationApproved !== false) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_MUTATION_METADATA: ${operationKey(operation)} must set x-bthwani-mutation-approved: false`,
    });
  }
  if (defaultEnabled !== false) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_MUTATION_METADATA: ${operationKey(operation)} must set x-bthwani-default-enabled: false`,
    });
  }
  if (!operation.responses.has("403")) {
    violations.push({
      file: operationFile(service, operation),
      line: operation.line,
      message: `MISSING_FEATURE_GATE_RESPONSE: ${operationKey(operation)} must document 403 FEATURE_NOT_ENABLED`,
    });
  }
}

const openApiRoutesByService = new Map();

for (const service of services) {
  const contracts = contractFiles(service);
  const operations = contracts.flatMap((contractFile) =>
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
        message: `FORBIDDEN_ROUTE: Route "${key}" is registered in Go router but not documented exactly in composed contracts: ${contracts.join(", ")}`,
      });
    }
  }

  for (const operation of operations) {
    const key = operationKey(operation);
    validatePathParameters(service, operation);
    validateInternalServiceRoute(service, operation);
    validateWltMutationMetadata(service, operation);
    validateWltFinancialReadRoute(service, operation);

    if (!goRouteSet.has(key)) {
      violations.push({
        file: operationFile(service, operation),
        line: operation.line,
        message: `MISSING_IMPLEMENTATION: Route "${key}" is documented in OpenAPI but not registered exactly in ${service.router}`,
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
    message: `FORBIDDEN_CROSS_SERVICE_CALL: Outbound request "${key}" to ${targetService} is not documented in its OpenAPI contract`,
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
    if (!literal.startsWith(prefix)) continue;

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
