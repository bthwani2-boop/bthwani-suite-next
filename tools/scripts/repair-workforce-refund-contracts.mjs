import fs from "node:fs";
import { parse, stringify } from "yaml";

function requireText(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label} is missing`);
  }
}

function repairWorkforceSchemas() {
  const file = "core/workforce/contracts/workforce.sovereign-leadership.openapi.yaml";
  let source = fs.readFileSync(file, "utf8");
  const schemaNames = [
    "UpdateDepartmentEmployeeRequest",
    "DepartmentEmployeeStatusChangeRequest",
    "UpsertEmployeeGovernanceRequest",
  ];
  if (schemaNames.every((name) => source.includes(`    ${name}:\n`))) {
    return;
  }
  const anchor = "    EmployeeSummary:\n";
  requireText(source, anchor, "EmployeeSummary schema anchor");
  const block = `    UpdateDepartmentEmployeeRequest:
      type: object
      additionalProperties: false
      required: [expectedVersion]
      properties:
        expectedVersion:
          type: integer
          minimum: 1
        fullNameAr:
          type: string
          minLength: 1
        fullNameEn:
          type: string
        engagementType:
          type: string
          const: employee
        engagementStartDate:
          type: string
          format: date
        photoMediaRef:
          type: string
        department:
          type: string
          pattern: '^[a-z0-9][a-z0-9_-]{1,63}$'
        role:
          type: string
          minLength: 1
        officeLocation:
          type: string
        supervisorActorId:
          type: string
    DepartmentEmployeeStatusChangeRequest:
      type: object
      additionalProperties: false
      required: [expectedVersion]
      properties:
        expectedVersion:
          type: integer
          minimum: 1
        reason:
          type: string
          minLength: 1
    UpsertEmployeeGovernanceRequest:
      type: object
      additionalProperties: false
      required:
        - expectedVersion
        - positionTitle
        - jobGrade
        - employmentClass
        - guaranteeType
        - guaranteeStatus
        - responsibilityScopes
        - managedDepartmentCodes
      properties:
        expectedVersion:
          type: integer
          minimum: 0
        positionTitle:
          type: string
          minLength: 1
        jobGrade:
          type: string
        employmentClass:
          type: string
          enum: [staff, coordinator, department_manager, executive, project_manager]
        guaranteeType:
          type: string
          enum: [none, personal, financial, institutional]
        guaranteeStatus:
          type: string
          enum: [not_required, pending, active, released, forfeited]
        guaranteeReference:
          type: string
        responsibilityScopes:
          type: array
          uniqueItems: true
          items:
            type: string
            minLength: 1
        managedDepartmentCodes:
          type: array
          uniqueItems: true
          items:
            type: string
            pattern: '^[a-z0-9][a-z0-9_-]{1,63}$'
        notes:
          type: string
      allOf:
        - if:
            properties:
              guaranteeStatus:
                enum: [active, forfeited]
          then:
            required: [guaranteeReference]
            properties:
              guaranteeType:
                not:
                  const: none
              guaranteeReference:
                minLength: 1
`;
  source = source.replace(anchor, block + anchor);
  fs.writeFileSync(file, source);
}

function consolidateRefundContract() {
  const root = "services/dsh/contracts";
  const entryPath = `${root}/dsh.openapi.yaml`;
  const modulePath = `${root}/dsh.refunds.openapi.yaml`;
  const miscPath = `${root}/paths/misc.paths.yaml`;
  const manifestPath = `${root}/contract.manifest.yaml`;
  const registryPath = `${root}/contract-registry.ts`;
  const refundPathsPath = `${root}/paths/refunds.paths.yaml`;
  const refundComponentsPath = `${root}/components/refunds.components.yaml`;

  if (!fs.existsSync(modulePath)) {
    if (!fs.existsSync(refundPathsPath) || !fs.existsSync(refundComponentsPath)) {
      throw new Error("Refund source is neither legacy module nor consolidated fragments");
    }
    return;
  }

  const moduleDoc = parse(fs.readFileSync(modulePath, "utf8"));
  const requiredPaths = [
    "/dsh/control-panel/finance/refunds",
    "/dsh/control-panel/finance/refunds/{refundId}",
    "/dsh/control-panel/finance/refunds/{refundId}/approve",
    "/dsh/control-panel/finance/refunds/{refundId}/reject",
    "/dsh/control-panel/finance/refunds/{refundId}/complete",
    "/dsh/control-panel/finance/refunds/{refundId}/reconcile",
    "/dsh/control-panel/finance/refunds/{refundId}/audit",
    "/dsh/client/orders/{orderId}/refunds",
    "/dsh/partner/orders/{orderId}/refunds",
  ];
  for (const route of requiredPaths) {
    if (!moduleDoc.paths?.[route]) {
      throw new Error(`Refund module missing ${route}`);
    }
  }

  const pathHeader = "# BThwani DSH OpenAPI path-items module: governed refunds.\n# Canonical source of truth for the full DSH refund journey.\n# Referenced by ../dsh.openapi.yaml; do not add an openapi root here.\n\n";
  fs.writeFileSync(refundPathsPath, pathHeader + stringify(moduleDoc.paths, { lineWidth: 0 }));

  const selectedParameters = ["RefundId", "OrderId", "CorrelationIdOptional"];
  const selectedResponses = [
    "BadRequest",
    "Unauthorized",
    "MutationReceiptFailure",
    "CompletionPersistenceFailure",
    "WltUnavailable",
  ];
  const components = {
    parameters: Object.fromEntries(selectedParameters.map((name) => [name, moduleDoc.components.parameters[name]])),
    schemas: moduleDoc.components.schemas,
    responses: Object.fromEntries(selectedResponses.map((name) => [name, moduleDoc.components.responses[name]])),
  };
  for (const [section, values] of Object.entries(components)) {
    if (!values || Object.values(values).some((value) => value === undefined)) {
      throw new Error(`Refund components incomplete: ${section}`);
    }
  }
  const componentHeader = "# BThwani DSH OpenAPI components module: governed refunds.\n# Canonical refund-specific parameters, schemas, and responses.\n# Shared bearer, correlation, idempotency, forbidden, not-found, and conflict components remain owned by dsh.openapi.yaml.\n\n";
  fs.writeFileSync(refundComponentsPath, componentHeader + stringify(components, { lineWidth: 0 }));

  let entry = fs.readFileSync(entryPath, "utf8");
  entry = entry.replace("  refunds: ./dsh.refunds.openapi.yaml\n", "");
  const oldRefundList = "  /dsh/control-panel/finance/refunds:\n    $ref: \"./paths/misc.paths.yaml#/~1dsh~1control-panel~1finance~1refunds\"\n";
  const newRefundRoutes = `${requiredPaths.map((route) => {
    const pointer = route.replaceAll("~", "~0").replaceAll("/", "~1");
    return `  ${route}:\n    $ref: \"./paths/refunds.paths.yaml#/${pointer}\"`;
  }).join("\n")}\n`;
  requireText(entry, oldRefundList, "Primary refund-list reference");
  entry = entry.replace(oldRefundList, newRefundRoutes);
  const oldRefundDetail = "  /dsh/control-panel/finance/refunds/{refundId}:\n    $ref: \"./paths/misc.paths.yaml#/~1dsh~1control-panel~1finance~1refunds~1{refundId}\"\n";
  requireText(entry, oldRefundDetail, "Parallel refund-detail reference");
  entry = entry.replace(oldRefundDetail, "");

  const parameterAnchor = "    CorrelationId:\n      $ref: \"./components/parameters.yaml#/CorrelationId\"\n";
  const refundParameters = "    RefundId:\n      $ref: \"./components/refunds.components.yaml#/parameters/RefundId\"\n    OrderId:\n      $ref: \"./components/refunds.components.yaml#/parameters/OrderId\"\n    CorrelationIdOptional:\n      $ref: \"./components/refunds.components.yaml#/parameters/CorrelationIdOptional\"\n";
  requireText(entry, parameterAnchor, "DSH parameter anchor");
  entry = entry.replace(parameterAnchor, parameterAnchor + refundParameters);

  const responseAnchor = "    ServiceUnavailable:\n      $ref: \"./components/responses.yaml#/ServiceUnavailable\"\n";
  const refundResponses = `${selectedResponses.map((name) => `    ${name}:\n      $ref: \"./components/refunds.components.yaml#/responses/${name}\"`).join("\n")}\n`;
  requireText(entry, responseAnchor, "DSH response anchor");
  entry = entry.replace(responseAnchor, responseAnchor + refundResponses);

  const schemaAnchor = "  schemas:\n";
  const refundSchemas = `${Object.keys(moduleDoc.components.schemas).map((name) => `    ${name}:\n      $ref: \"./components/refunds.components.yaml#/schemas/${name}\"`).join("\n")}\n`;
  requireText(entry, schemaAnchor, "DSH schema anchor");
  entry = entry.replace(schemaAnchor, schemaAnchor + refundSchemas);
  fs.writeFileSync(entryPath, entry);

  let misc = fs.readFileSync(miscPath, "utf8");
  const start = misc.indexOf("/dsh/control-panel/finance/refunds:\n");
  const end = misc.indexOf("/dsh/control-panel/finance/ledger/entries:\n");
  if (start < 0 || end <= start) {
    throw new Error("Parallel refund blocks were not found in misc.paths.yaml");
  }
  misc = misc.slice(0, start) + misc.slice(end);
  fs.writeFileSync(miscPath, misc);

  let manifest = fs.readFileSync(manifestPath, "utf8");
  requireText(manifest, "  - dsh.refunds.openapi.yaml\n", "Refund manifest entry");
  manifest = manifest.replace("  - dsh.refunds.openapi.yaml\n", "");
  fs.writeFileSync(manifestPath, manifest);

  let registry = fs.readFileSync(registryPath, "utf8");
  registry = registry.replace("    | \"dsh-refunds\"\n", "");
  const registration = /\n  \{\n    id: "dsh-refunds",\n    path: "contracts\/dsh\.refunds\.openapi\.yaml",\n    state: "CONTRACT_ACTIVE",\n    runtimeDependency: true,\n    clientStrategy: "STANDALONE_MANUAL_TYPED_ADAPTER",\n    adapterOwner: "frontend\/shared\/finance-wlt-link",\n  \},/;
  if (!registration.test(registry)) {
    throw new Error("Refund registry entry is missing");
  }
  registry = registry.replace(registration, "");
  fs.writeFileSync(registryPath, registry);
  fs.unlinkSync(modulePath);
}

repairWorkforceSchemas();
consolidateRefundContract();
console.log("contract repair transformation: PASS");
