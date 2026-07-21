import fs from "node:fs";
import path from "node:path";
import { fail, read, repoRoot } from "../_guard-utils.mjs";
import { parseOpenApiContract } from "../_openapi-utils.mjs";

const guardId = "jrn-008-contract-ownership-gate";
const violations = [];
const contractFile = "services/dsh/contracts/dsh.catalog-governance.openapi.yaml";
const registryFile = "services/dsh/contracts/contract-registry.ts";
const capabilityFile = "services/dsh/capability-map.extensions.ts";
const routerFile = "services/dsh/backend/internal/http/catalog_unified_routes.go";
const adapterFile = "services/dsh/frontend/shared/catalog/catalog-governance.api.ts";
const primaryContract = "services/dsh/contracts/dsh.openapi.yaml";

for (const file of [contractFile, registryFile, capabilityFile, routerFile, adapterFile, primaryContract]) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    violations.push({ file, line: 0, message: "JRN008_REQUIRED_FILE_MISSING" });
  }
}

const contract = read(contractFile);
const registry = read(registryFile);
const capability = read(capabilityFile);
const router = read(routerFile);
const adapter = read(adapterFile);
const primaryOperations = new Set(
  parseOpenApiContract(primaryContract).map((operation) => operation.operationId).filter(Boolean),
);
const operations = parseOpenApiContract(contractFile);

for (const marker of [
  "x-bthwani-contract-state: CONTRACT_ACTIVE",
  "x-bthwani-client-generation: DISABLED",
  "x-bthwani-client-binding: MANUAL_TYPED_ADAPTER",
  "x-bthwani-adapter-owner: frontend/shared/catalog/catalog-governance.api.ts",
]) {
  if (!contract.includes(marker)) {
    violations.push({ file: contractFile, line: 0, message: `JRN008_CONTRACT_METADATA_MISSING:${marker}` });
  }
}

const registrationBlock = registry.match(/\{\s*id:\s*"dsh-catalog-governance"[\s\S]*?\n\s*\}/)?.[0] ?? "";
for (const marker of [
  'path: "contracts/dsh.catalog-governance.openapi.yaml"',
  'state: "CONTRACT_ACTIVE"',
  'clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER"',
  'adapterOwner: "frontend/shared/catalog/catalog-governance.api.ts"',
]) {
  if (!registrationBlock.includes(marker)) {
    violations.push({ file: registryFile, line: 0, message: `JRN008_REGISTRATION_MISSING:${marker}` });
  }
}

const operationIds = new Set();
for (const operation of operations) {
  if (!operation.operationId) {
    violations.push({ file: contractFile, line: operation.line, message: `JRN008_OPERATION_ID_MISSING:${operation.method} ${operation.path}` });
    continue;
  }
  if (operationIds.has(operation.operationId)) {
    violations.push({ file: contractFile, line: operation.line, message: `JRN008_DUPLICATE_OPERATION_ID:${operation.operationId}` });
  }
  operationIds.add(operation.operationId);

  if (primaryOperations.has(operation.operationId)) {
    violations.push({ file: contractFile, line: operation.line, message: `JRN008_STANDALONE_OPERATION_DUPLICATES_PRIMARY:${operation.operationId}` });
  }
  if (!capability.includes(`"${operation.operationId}"`)) {
    violations.push({ file: capabilityFile, line: 0, message: `JRN008_OPERATION_UNOWNED:${operation.operationId}` });
  }
  const routeMarker = `${operation.method} ${operation.path}`;
  if (!router.includes(routeMarker)) {
    violations.push({ file: routerFile, line: 0, message: `JRN008_ROUTE_NOT_REGISTERED:${routeMarker}` });
  }
}

const expectedOperations = [
  "listOperatorCatalogAttributes",
  "createOperatorCatalogAttribute",
  "listOperatorCatalogAttributeOptions",
  "createOperatorCatalogAttributeOption",
  "upsertOperatorCatalogNodeAttributeRule",
  "listOperatorMasterProductAttributeValues",
  "upsertOperatorMasterProductAttributeValue",
  "listOperatorMasterProductRelationships",
  "upsertOperatorMasterProductRelationship",
  "deleteOperatorMasterProductRelationship",
  "listOperatorAssortmentPauses",
  "pauseOperatorStoreAssortment",
  "resumeOperatorStoreAssortment",
  "listOperatorCatalogAudit",
  "rollbackOperatorCatalogAudit",
  "listPartnerCatalogAttributes",
  "listPartnerCatalogAttributeOptions",
  "listPartnerMasterProductAttributeValues",
  "listPartnerMasterProductRelationships",
  "listPartnerAssortmentPauses",
  "pausePartnerStoreAssortment",
  "resumePartnerStoreAssortment",
  "listFieldCatalogAttributes",
  "listFieldCatalogAttributeOptions",
  "listFieldMasterProductAttributeValues",
  "listFieldMasterProductRelationships",
  "listFieldAssortmentPauses",
  "pauseFieldStoreAssortment",
  "resumeFieldStoreAssortment",
];
for (const operationId of expectedOperations) {
  if (!operationIds.has(operationId)) {
    violations.push({ file: contractFile, line: 0, message: `JRN008_REQUIRED_OPERATION_MISSING:${operationId}` });
  }
}
if (operationIds.size !== expectedOperations.length) {
  violations.push({ file: contractFile, line: 0, message: `JRN008_OPERATION_COUNT_DRIFT:${operationIds.size}/${expectedOperations.length}` });
}

for (const exportedFunction of [
  "fetchOperatorCatalogAttributes",
  "createOperatorCatalogAttribute",
  "fetchOperatorCatalogAttributeOptions",
  "createOperatorCatalogAttributeOption",
  "upsertOperatorCatalogNodeAttributeRule",
  "fetchOperatorMasterProductAttributeValues",
  "upsertOperatorMasterProductAttributeValue",
  "fetchOperatorMasterProductRelationships",
  "upsertOperatorMasterProductRelationship",
  "deleteOperatorMasterProductRelationship",
  "fetchOperatorAssortmentPauses",
  "pauseOperatorStoreAssortment",
  "resumeOperatorStoreAssortment",
  "fetchOperatorCatalogAudit",
  "rollbackOperatorCatalogAudit",
  "fetchPartnerCatalogAttributes",
  "fetchPartnerCatalogAttributeOptions",
  "fetchPartnerMasterProductAttributeValues",
  "fetchPartnerMasterProductRelationships",
  "fetchPartnerAssortmentPauses",
  "pausePartnerStoreAssortment",
  "resumePartnerStoreAssortment",
  "fetchFieldCatalogAttributes",
  "fetchFieldCatalogAttributeOptions",
  "fetchFieldMasterProductAttributeValues",
  "fetchFieldMasterProductRelationships",
  "fetchFieldAssortmentPauses",
  "pauseFieldStoreAssortment",
  "resumeFieldStoreAssortment",
]) {
  if (!adapter.includes(`function ${exportedFunction}`)) {
    violations.push({ file: adapterFile, line: 0, message: `JRN008_TYPED_ADAPTER_EXPORT_MISSING:${exportedFunction}` });
  }
}

for (const forbidden of [
  "/dsh/partner/stores/${encodeURIComponent(storeId)}/catalog/products",
  "/dsh/field/partners/${encodeURIComponent(partnerId)}/catalog/products",
]) {
  if (adapter.includes(forbidden)) {
    violations.push({ file: adapterFile, line: 0, message: `JRN008_PARALLEL_LOCAL_CATALOG_FORBIDDEN:${forbidden}` });
  }
}

fail(guardId, violations);
