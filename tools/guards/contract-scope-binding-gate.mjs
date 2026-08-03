#!/usr/bin/env node
// Verifies that every authorization scope/permission literal enforced by Go
// route guards has a matching entry in governance/contracts/scope-vocabulary.json,
// and that the vocabulary carries no stale entries no longer enforced anywhere.
//
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const repositoryRoot = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");
const vocabularyRelative = "governance/contracts/scope-vocabulary.json";
const vocabulary = JSON.parse(fs.readFileSync(path.join(repositoryRoot, vocabularyRelative), "utf8"));

const failures = [];

// Scopes enforced only through dynamic dispatch (a helper function returns
// one of several *Permission* constants at runtime based on input, and the
// call site passes that return value straight into a require*Permission
// wrapper). The static scan below cannot trace a value through a helper
// function call, so these are recorded here after manual verification of
// every branch of the deciding helper and its call site.
const dynamicallyEnforcedScopes = new Map([
  [
    "catalog.proposal.adopt",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: decideProposalPermissionAction/proposalTransitionPermissionAction, called from catalog_proposal_occ_handlers.go via requireCatalogPermission",
  ],
  [
    "catalog.proposal.review",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: decideProposalPermissionAction/proposalTransitionPermissionAction, called from catalog_proposal_occ_handlers.go via requireCatalogPermission",
  ],
  [
    "catalog.proposal.marketing_review",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: proposalTransitionPermissionAction, called from catalog_proposal_occ_handlers.go via requireCatalogPermission",
  ],
  [
    "catalog.proposal.publish",
    "services/dsh/backend/internal/http/centralcatalog_catalog.go: proposalTransitionPermissionAction, called from catalog_proposal_occ_handlers.go via requireCatalogPermission",
  ],
]);

const declared = new Set();
for (const family of vocabulary.families ?? []) {
  for (const entry of family.scopes ?? []) {
    if (declared.has(entry.scope)) failures.push(`${vocabularyRelative}: duplicate scope '${entry.scope}'`);
    declared.add(entry.scope);
  }
}

// Go source roots scanned for enforced scope/permission literals, and the
// call-site patterns that carry a literal as an argument. Test files are
// excluded: they may reference fixture scopes that were never wired to a
// real route.
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
      // Covers requirePermission, requireCatalogPermission,
      // requireAdministrationPermission, and any future require*Permission
      // wrapper: they all take a *Permission* constant identifying the scope,
      // just with different surrounding argument shapes.
      /require[A-Za-z]*Permission\(\s*w,\s*r,\s*(?:"[^"]*",\s*)?([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*[,)]/g,
      /serve[A-Za-z]*PermissionHandler\(\s*w,\s*r,[\s\S]*?,\s*([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*)\s*[,)]/g,
    ],
  },
];

// DSH passes permission constants (not string literals) into requirePermission
// at most call sites. Resolve `FooPermissionBar = "foo.bar"` declarations
// first, then substitute constant names encountered at call sites.
function collectDshPermissionConstants(root) {
  const constants = new Map();
  const constPattern = /([A-Za-z]+Permission[A-Za-z]*)\s*=\s*"([a-zA-Z0-9_.:-]+)"/g;
  for (const file of walk(root)) {
    if (file.endsWith("_test.go")) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(constPattern)) constants.set(match[1], match[2]);
  }
  return constants;
}

function* walk(dir) {
  const absolute = path.join(repositoryRoot, dir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name);
    const relative = path.relative(repositoryRoot, full).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      yield* walk(relative);
    } else if (entry.name.endsWith(".go")) {
      yield relative;
    }
  }
}

const enforced = new Set(dynamicallyEnforcedScopes.keys());
const dshConstants = collectDshPermissionConstants("services/dsh/backend");

for (const target of scanTargets) {
  for (const file of walk(target.root)) {
    if (file.endsWith("_test.go")) continue;
    const text = fs.readFileSync(path.join(repositoryRoot, file), "utf8");
    for (const pattern of target.patterns) {
      for (const match of text.matchAll(pattern)) {
        if (match[1] && /^[A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*$/.test(match[1]) && !match[1].includes(".")) {
          // Captured a *Permission* constant identifier, not a literal scope
          // string -- resolve it through the constant declarations.
          const resolved = dshConstants.get(match[1]);
          if (resolved) enforced.add(resolved);
          else failures.push(`services/dsh/backend: unresolved permission constant '${match[1]}' referenced in ${file}`);
          continue;
        }
        if (match[1]) {
          enforced.add(match[1]);
          continue;
        }
        // Constant-reference form: extract the trailing identifier and resolve it.
        const constMatch = match[0].match(/([A-Za-z][A-Za-z0-9]*Permission[A-Za-z0-9]*),\s*$/);
        if (constMatch) {
          const resolved = dshConstants.get(constMatch[1]);
          if (resolved) enforced.add(resolved);
          else failures.push(`services/dsh/backend: unresolved permission constant '${constMatch[1]}' referenced in ${file}`);
        }
      }
    }
  }
}

for (const scope of enforced) {
  if (!declared.has(scope)) {
    failures.push(`Go enforces scope '${scope}' with no entry in ${vocabularyRelative}`);
  }
}

// Every declared scope must be enforced somewhere -- a scope granted by
// Identity/RBAC seed data but checked by no handler is either a capability
// that was never finished or a stale leftover, and both are indistinguishable
// from a silent authorization hole from the outside. This was a WARNING
// until the vocabulary carried 49 such scopes; each was manually traced to
// either genuine Go enforcement the scan patterns above now recognize, or a
// capability that does not exist yet and was removed from the vocabulary.
// No unenforced scope may be reintroduced without either wiring it to a real
// authorization check or leaving it out of this file.
for (const scope of declared) {
  if (!enforced.has(scope)) {
    failures.push(`${vocabularyRelative}: scope '${scope}' is declared but enforced nowhere in Go`);
  }
}

// The captain financial-eligibility slice is the first DSH contract with
// operation-level authorization and error metadata. Bind that metadata to the
// registered Go route and handler so future slices can adopt the same generic
// extension without creating a parallel registry.
const eligibilityContractRelative = "services/dsh/contracts/dsh.captain-financial-eligibility.openapi.yaml";
const eligibilityContract = YAML.parse(
  fs.readFileSync(path.join(repositoryRoot, eligibilityContractRelative), "utf8"),
);
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
  "getDispatchBalancePolicy",
  "upsertDispatchBalancePolicy",
  "getOperatorCaptainFinancialEligibility",
  "refreshOperatorCaptainFinancialEligibility",
]);
const actorBoundOperationIds = new Set([
  "getOwnCaptainFinancialEligibility",
  "refreshOwnCaptainFinancialEligibility",
]);

const routeBindings = new Map();
for (const file of walk("services/dsh/backend/internal/http")) {
  if (file.endsWith("_test.go")) continue;
  const source = fs.readFileSync(path.join(repositoryRoot, file), "utf8");
  for (const match of source.matchAll(/mux\.HandleFunc\("([A-Z]+) ([^"]+)",\s*protected\.([A-Za-z0-9_]+)\)/g)) {
    routeBindings.set(`${match[1]} ${match[2]}`, { handler: match[3], file });
  }
}

function findHandlerSource(handlerName) {
  const signature = `func (s *protectedStoreServer) ${handlerName}(`;
  for (const file of walk("services/dsh/backend/internal/http")) {
    if (file.endsWith("_test.go")) continue;
    const source = fs.readFileSync(path.join(repositoryRoot, file), "utf8");
    const signatureIndex = source.indexOf(signature);
    if (signatureIndex < 0) continue;
    const bodyStart = source.indexOf("{", signatureIndex + signature.length);
    if (bodyStart < 0) break;
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) return { file, text: source.slice(bodyStart + 1, index) };
    }
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
    failures.push(`${route.file}: registered handler '${route.handler}' for ${operationId} was not found`);
    continue;
  }

  if (permissionBoundOperationIds.has(operationId)) {
    if (!Array.isArray(permissions) || permissions.length !== 1 || !declared.has(permissions[0])) {
      failures.push(`${eligibilityContractRelative}: ${operationId} must declare exactly one vocabulary-backed permission`);
      continue;
    }
    const permissionMatch = handler.text.match(/requirePermission\(w,\s*r,\s*"[^"]+",\s*([A-Za-z][A-Za-z0-9]*)\)/);
    const enforcedPermission = permissionMatch ? dshConstants.get(permissionMatch[1]) : undefined;
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

console.log(`contract-scope-binding-gate: OK (${declared.size} declared scopes, ${enforced.size} enforced literals, ${eligibilityOperations.size} eligibility operations bound to Go routes and contract metadata)`);
